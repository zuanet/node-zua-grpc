"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const flow_async_1 = require("@aspectron/flow-async");
const gRPC = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path_1 = require("path");
class Client {
    constructor(options) {
        this.reconnect = true;
        this.verbose = false;
        this.subscribers = new Map();
        this.isConnected = false;
        this.connectCBs = [];
        this.connectFailureCBs = [];
        this.errorCBs = [];
        this.disconnectCBs = [];
        this.options = Object.assign({
            protoPath: __dirname + '/../../proto/messages.proto',
            host: 'localhost:16210',
            reconnect: true,
            verbose: false,
            uid: (Math.random() * 1000).toFixed(0),
        }, options || {});
        this.pending = {};
        this.log = Function.prototype.bind.call(console.log, console, `[Zua gRPC ${this.options.uid}]:`);
        this.reconnect = this.options.reconnect;
        this.verbose = this.options.verbose;
        this.connectionPhase = false;
        this.disableConnectionCheck = options.disableConnectionCheck || false;
        // console.log(this);
    }
    getServiceClient() {
        const { protoPath } = this.options;
        const packageDefinition = protoLoader.loadSync(protoPath, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });
        const proto = gRPC.loadPackageDefinition(packageDefinition);
        this.proto = proto.protowire;
        const { P2P, RPC } = proto.protowire;
        return RPC;
    }
    connect() {
        this.reconnect = true;
        return this._connect();
    }
    _connect() {
        return __awaiter(this, void 0, void 0, function* () {
            // console.trace("gRPC connection phase...");
            this.verbose && this.log('gRPC Client connecting to', this.options.host);
            if (!this.client) {
                const RPC = this.getServiceClient();
                this.client = new RPC(this.options.host, gRPC.credentials.createInsecure(), {
                    // "grpc.keepalive_timeout_ms": 25000 
                    "grpc.max_receive_message_length": -1
                });
            }
            else {
                // console.log("WARNING: multiple gRPC connection phases!");
                return new Promise((resolve) => {
                    this.onConnect(resolve);
                });
            }
            yield this._connectClient();
        });
    }
    _reconnect(reason) {
        this._setConnected(false);
        if (this.reconnect_dpc) {
            flow_async_1.clearDPC(this.reconnect_dpc);
            delete this.reconnect_dpc;
        }
        this.clearPending(reason);
        delete this.stream;
        //delete this.client;
        if (this.reconnect) {
            this.reconnect_dpc = flow_async_1.dpc(1000, () => {
                this._connectClient();
            });
        }
    }
    _connectClient() {
        return __awaiter(this, void 0, void 0, function* () {
            this.client.waitForReady(2500, (connect_error) => {
                if (connect_error) {
                    //console.log("connect_error")
                    //this.connectionPhase = false;
                    this._reconnect('client connect deadline reached');
                    return path_1.resolve();
                }
                console.log("client connected");
                this.stream = this.createStream();
                this.initIntake(this.stream);
                this.stream.on('error', (error) => {
                    // console.log("client:",error);
                    this.errorCBs.forEach(fn => fn(error.toString(), error));
                    this.verbose && this.log('stream:error', error);
                    this._reconnect(error);
                });
                this.stream.on('end', (...args) => {
                    this.verbose && this.log('stream:end', ...args);
                    this._reconnect('stream end');
                });
                if (this.disableConnectionCheck)
                    return path_1.resolve();
                flow_async_1.dpc(100, () => __awaiter(this, void 0, void 0, function* () {
                    let response = yield this.call('getVirtualSelectedParentBlueScoreRequest', {})
                        .catch(e => {
                        this.connectFailureCBs.forEach(fn => fn(e));
                    });
                    this.verbose && this.log("getVirtualSelectedParentBlueScoreRequest:response", response);
                    if (response && response.blueScore) {
                        this._setConnected(true);
                    }
                    path_1.resolve();
                }));
            });
        });
    }
    _setConnected(isConnected) {
        if (this.isConnected == isConnected)
            return;
        this.isConnected = isConnected;
        let cbs = isConnected ? this.connectCBs : this.disconnectCBs;
        //console.log("this.isConnected", this.isConnected, cbs)
        cbs.forEach(fn => {
            fn();
        });
    }
    onConnect(callback) {
        this.connectCBs.push(callback);
        if (this.isConnected)
            callback();
    }
    onConnectFailure(callback) {
        this.connectFailureCBs.push(callback);
    }
    onError(callback) {
        this.errorCBs.push(callback);
    }
    onDisconnect(callback) {
        this.disconnectCBs.push(callback);
    }
    disconnect() {
        if (this.reconnect_dpc) {
            flow_async_1.clearDPC(this.reconnect_dpc);
            delete this.reconnect_dpc;
        }
        this.reconnect = false;
        this.stream && this.stream.end();
        this.clearPending();
    }
    clearPending(reason) {
        Object.keys(this.pending).forEach(key => {
            let list = this.pending[key];
            list.forEach(o => o.reject(reason || 'closing by force'));
            this.pending[key] = [];
        });
    }
    close() {
        this.disconnect();
    }
    createStream() {
        if (!this.client)
            return null;
        const stream = this.client.MessageStream(() => {
        });
        //console.log("stream", stream)
        return stream;
    }
    initIntake(stream) {
        stream.on('data', (data) => {
            //this.log("stream:data", data)
            if (data.payload) {
                let name = data.payload;
                let payload = data[name];
                let ident = name.replace(/^get|Response$/ig, '').toLowerCase();
                this.handleIntake({ name, payload, ident });
            }
        });
    }
    handleIntake(o) {
        if (this.intakeHandler) {
            this.intakeHandler(o);
        }
        else {
            let handlers = this.pending[o.name];
            this.verbose && console.log('intake:', o, 'handlers:', handlers);
            //if(o.name == 'getUtxosByAddressesResponse'){
            //	console.log(JSON.stringify(o, null, "  "));
            //}
            if (handlers && handlers.length) {
                let pending = handlers.shift();
                if (pending)
                    pending.resolve(o.payload);
            }
            let subscribers = this.subscribers.get(o.name);
            //this.log("handleIntake:o.name:", o.name, subscribers)
            if (subscribers) {
                subscribers.map(subscriber => {
                    subscriber.callback(o.payload);
                });
            }
        }
    }
    setIntakeHandler(fn) {
        this.intakeHandler = fn;
    }
    post(name, args = {}) {
        if (!this.stream)
            return false;
        let req = {
            [name]: args
        };
        this.verbose && this.log('post:', req);
        this.stream.write(req);
        return true;
    }
    call(method, data) {
        this.verbose && this.log('call to', method);
        if (!this.client)
            return Promise.reject('not connected');
        return new Promise((resolve, reject) => {
            let stream = this.stream;
            if (!stream) {
                this.verbose && this.log('could not create stream');
                return reject('not connected');
            }
            const resp = method.replace(/Request$/, 'Response');
            if (!this.pending[resp])
                this.pending[resp] = [];
            let handlers = this.pending[resp];
            handlers.push({ method, data, resolve, reject });
            this.post(method, data);
        });
    }
    subscribe(subject, data = {}, callback) {
        if (typeof data == 'function') {
            callback = data;
            data = {};
        }
        this.verbose && this.log('subscribe to', subject);
        if (!this.client)
            return Promise.reject('not connected');
        let eventName = this.subject2EventName(subject);
        this.verbose && this.log("subscribe:eventName", eventName);
        let subscribers = this.subscribers.get(eventName);
        if (!subscribers) {
            subscribers = [];
            this.subscribers.set(eventName, subscribers);
        }
        let uid = (Math.random() * 100000 + Date.now()).toFixed(0);
        subscribers.push({ uid, callback });
        let p = this.call(subject, data);
        p.uid = uid;
        return p;
    }
    subject2EventName(subject) {
        let eventName = subject.replace("notify", "").replace("Request", "Notification");
        return eventName[0].toLowerCase() + eventName.substr(1);
    }
    unSubscribe(subject, uid = '') {
        let eventName = this.subject2EventName(subject);
        let subscribers = this.subscribers.get(eventName);
        if (!subscribers)
            return;
        if (!uid) {
            this.subscribers.delete(eventName);
        }
        else {
            subscribers = subscribers.filter(sub => sub.uid != uid);
            this.subscribers.set(eventName, subscribers);
        }
    }
}
exports.Client = Client;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL2NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFHQSxzREFBc0Q7QUFDdEQsc0NBQXNDO0FBQ3RDLGtEQUFrRDtBQU1sRCwrQkFBK0I7QUFHL0IsTUFBYSxNQUFNO0lBb0JsQixZQUFZLE9BQVc7UUFmdkIsY0FBUyxHQUFXLElBQUksQ0FBQztRQUd6QixZQUFPLEdBQVcsS0FBSyxDQUFDO1FBR3hCLGdCQUFXLEdBQXNCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDM0MsZ0JBQVcsR0FBUyxLQUFLLENBQUM7UUFDMUIsZUFBVSxHQUFjLEVBQUUsQ0FBQztRQUMzQixzQkFBaUIsR0FBYyxFQUFFLENBQUM7UUFDbEMsYUFBUSxHQUFjLEVBQUUsQ0FBQztRQUN6QixrQkFBYSxHQUFjLEVBQUUsQ0FBQztRQUs3QixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDNUIsU0FBUyxFQUFFLFNBQVMsR0FBRyw2QkFBNkI7WUFDcEQsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixTQUFTLEVBQUUsSUFBSTtZQUNmLE9BQU8sRUFBRyxLQUFLO1lBQ2YsR0FBRyxFQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDbkMsRUFBRSxPQUFPLElBQUUsRUFBRSxDQUFDLENBQUM7UUFDaEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxFQUFHLENBQUM7UUFDbkIsSUFBSSxDQUFDLEdBQUcsR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQ3RDLE9BQU8sQ0FBQyxHQUFHLEVBQ1gsT0FBTyxFQUNQLGVBQWUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FDbkMsQ0FBQztRQUNGLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE9B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T0FBTyxDQUFDLENBQUM7UUFDaEQsSUFBSSxXQUFXLEdBQThCLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzdFLElBQUcsQ0FBQyxXQUFXO1lBQ2QsT0FBTTtRQUNQLElBQUcsQ0FBQyxHQUFHLEVBQUM7WUFDUCxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztTQUNuQzthQUFJO1lBQ0osV0FBVyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFBLEVBQUUsQ0FBQSxHQUFHLENBQUMsR0FBRyxJQUFFLEdBQUcsQ0FBQyxDQUFBO1lBQ25ELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUMsQ0FBQztTQUM3QztJQUNGLENBQUM7Q0FFRDtBQS9URCx3QkErVEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IEV2ZW50RW1pdHRlciB9IGZyb20gJ2V2ZW50cyc7XHJcbmltcG9ydCB7IGRwYywgY2xlYXJEUEMgfSBmcm9tICdAYXNwZWN0cm9uL2Zsb3ctYXN5bmMnO1xyXG5pbXBvcnQgKiBhcyBnUlBDIGZyb20gJ0BncnBjL2dycGMtanMnO1xyXG5pbXBvcnQgKiBhcyBwcm90b0xvYWRlciBmcm9tICdAZ3JwYy9wcm90by1sb2FkZXInO1xyXG5pbXBvcnQge1xyXG5cdFBlbmRpbmdSZXFzLCBJRGF0YSwgSVN0cmVhbSwgUXVldWVJdGVtLCBNZXNzYWdlc1Byb3RvLFxyXG5cdFNlcnZpY2VDbGllbnRDb25zdHJ1Y3RvciwgS2FzcGFkUGFja2FnZSwgU3Vic2NyaWJlckl0ZW0sIFN1YnNjcmliZXJJdGVtTWFwLFxyXG5cdFJQQyBhcyBScGNcclxufSBmcm9tICcuLi90eXBlcy9jdXN0b20tdHlwZXMnO1xyXG5pbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAncGF0aCc7XHJcblxyXG4gXHJcbmV4cG9ydCBjbGFzcyBDbGllbnQge1xyXG5cdHN0cmVhbTpJU3RyZWFtO1xyXG5cdG9wdGlvbnM6YW55O1xyXG5cdHBlbmRpbmc6UGVuZGluZ1JlcXM7XHJcblx0aW50YWtlSGFuZGxlcjpGdW5jdGlvbnx1bmRlZmluZWQ7XHJcblx0cmVjb25uZWN0OmJvb2xlYW4gPSB0cnVlO1xyXG5cdGNsaWVudDphbnl8dW5kZWZpbmVkO1xyXG5cdHJlY29ubmVjdF9kcGM6bnVtYmVyfHVuZGVmaW5lZDtcclxuXHR2ZXJib3NlOmJvb2xlYW4gPSBmYWxzZTtcclxuXHRsb2c6RnVuY3Rpb247XHJcblx0cHJvdG86S2FzcGFkUGFja2FnZXx1bmRlZmluZWQ7XHJcblx0c3Vic2NyaWJlcnM6IFN1YnNjcmliZXJJdGVtTWFwID0gbmV3IE1hcCgpO1xyXG5cdGlzQ29ubmVjdGVkOmJvb2xlYW49ZmFsc2U7XHJcblx0Y29ubmVjdENCczpGdW5jdGlvbltdID0gW107XHJcblx0Y29ubmVjdEZhaWx1cmVDQnM6RnVuY3Rpb25bXSA9IFtdO1xyXG5cdGVycm9yQ0JzOkZ1bmN0aW9uW10gPSBbXTtcclxuXHRkaXNjb25uZWN0Q0JzOkZ1bmN0aW9uW10gPSBbXTtcclxuXHRjb25uZWN0aW9uUGhhc2U6Ym9vbGVhbjtcclxuXHRkaXNhYmxlQ29ubmVjdGlvbkNoZWNrOmJvb2xlYW47XHJcblxyXG5cdGNvbnN0cnVjdG9yKG9wdGlvbnM6YW55KSB7XHJcblx0XHR0aGlzLm9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHtcclxuXHRcdFx0cHJvdG9QYXRoOiBfX2Rpcm5hbWUgKyAnLy4uLy4uL3Byb3RvL21lc3NhZ2VzLnByb3RvJyxcclxuXHRcdFx0aG9zdDogJ2xvY2FsaG9zdDoxNjIxMCcsXHJcblx0XHRcdHJlY29ubmVjdDogdHJ1ZSxcclxuXHRcdFx0dmVyYm9zZSA6IGZhbHNlLFxyXG5cdFx0XHR1aWQ6KE1hdGgucmFuZG9tKCkqMTAwMCkudG9GaXhlZCgwKSxcclxuXHRcdH0sIG9wdGlvbnN8fHt9KTtcclxuXHRcdHRoaXMucGVuZGluZyA9IHsgfTtcclxuXHRcdHRoaXMubG9nID0gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQuY2FsbChcclxuXHRcdFx0Y29uc29sZS5sb2csXHJcblx0XHRcdGNvbnNvbGUsXHJcblx0XHRcdGBbS2FzcGEgZ1JQQyAke3RoaXMub3B0aW9ucy51aWR9XTpgXHJcblx0XHQpO1xyXG5cdFx0dGhpcy5yZWNvbm5lY3QgPSB0aGlzLm9wdGlvbnMucmVjb25uZWN0O1xyXG5cdFx0dGhpcy52ZXJib3NlID0gdGhpcy5vcHRpb25zLnZlcmJvc2U7XHJcblx0XHR0aGlzLmNvbm5lY3Rpb25QaGFzZSA9IGZhbHNlO1xyXG5cdFx0dGhpcy5kaXNhYmxlQ29ubmVjdGlvbkNoZWNrID0gb3B0aW9ucy5kaXNhYmxlQ29ubmVjdGlvbkNoZWNrIHx8IGZhbHNlO1xyXG5cdFx0Ly8gY29uc29sZS5sb2codGhpcyk7XHJcblx0fVxyXG5cclxuXHRnZXRTZXJ2aWNlQ2xpZW50KCk6U2VydmljZUNsaWVudENvbnN0cnVjdG9yIHtcclxuXHRcdGNvbnN0IHtwcm90b1BhdGh9ID0gdGhpcy5vcHRpb25zO1xyXG5cdFx0Y29uc3QgcGFja2FnZURlZmluaXRpb24gPSBwcm90b0xvYWRlci5sb2FkU3luYyhwcm90b1BhdGgsIHtcclxuXHRcdFx0a2VlcENhc2U6IHRydWUsXHJcblx0XHRcdGxvbmdzOiBTdHJpbmcsXHJcblx0XHRcdGVudW1zOiBTdHJpbmcsXHJcblx0XHRcdGRlZmF1bHRzOiB0cnVlLFxyXG5cdFx0XHRvbmVvZnM6IHRydWVcclxuXHRcdH0pO1xyXG5cclxuXHRcdGNvbnN0IHByb3RvOk1lc3NhZ2VzUHJvdG8gPSA8TWVzc2FnZXNQcm90bz5nUlBDLmxvYWRQYWNrYWdlRGVmaW5pdGlvbihwYWNrYWdlRGVmaW5pdGlvbik7XHJcblx0XHR0aGlzLnByb3RvID0gcHJvdG8ucHJvdG93aXJlO1xyXG5cdFx0Y29uc3Qge1AyUCwgUlBDfSA9IHByb3RvLnByb3Rvd2lyZTtcclxuXHRcdHJldHVybiBSUEM7XHJcblx0fVxyXG5cdGNvbm5lY3QoKXtcclxuXHRcdHRoaXMucmVjb25uZWN0ID0gdHJ1ZTtcclxuXHRcdHJldHVybiB0aGlzLl9jb25uZWN0KCk7XHJcblx0fVxyXG5cclxuXHRhc3luYyBfY29ubmVjdCgpIHtcclxuXHRcdC8vIGNvbnNvbGUudHJhY2UoXCJnUlBDIGNvbm5lY3Rpb24gcGhhc2UuLi5cIik7XHJcblx0XHR0aGlzLnZlcmJvc2UgJiYgdGhpcy5sb2coJ2dSUEMgQ2xpZW50IGNvbm5lY3RpbmcgdG8nLCB0aGlzLm9wdGlvbnMuaG9zdCk7XHJcblx0XHRpZighdGhpcy5jbGllbnQpe1xyXG5cdFx0XHRjb25zdCBSUEMgPSB0aGlzLmdldFNlcnZpY2VDbGllbnQoKTtcclxuXHRcdFx0dGhpcy5jbGllbnQgPSBuZXcgUlBDKHRoaXMub3B0aW9ucy5ob3N0LCBnUlBDLmNyZWRlbnRpYWxzLmNyZWF0ZUluc2VjdXJlKCksXHJcblx0XHRcdFx0eyBcclxuXHRcdFx0XHRcdC8vIFwiZ3JwYy5rZWVwYWxpdmVfdGltZW91dF9tc1wiOiAyNTAwMCBcclxuXHRcdFx0XHRcdFwiZ3JwYy5tYXhfcmVjZWl2ZV9tZXNzYWdlX2xlbmd0aFwiOiAtMVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0KTtcclxuXHRcdH1lbHNle1xyXG5cdFx0XHQvLyBjb25zb2xlLmxvZyhcIldBUk5JTkc6IG11bHRpcGxlIGdSUEMgY29ubmVjdGlvbiBwaGFzZXMhXCIpO1xyXG5cdFx0XHRyZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuXHRcdFx0XHR0aGlzLm9uQ29ubmVjdChyZXNvbHZlKTtcclxuXHRcdFx0fSlcclxuXHRcdH1cclxuXHJcblx0XHRhd2FpdCB0aGlzLl9jb25uZWN0Q2xpZW50KCk7XHJcblx0fVxyXG5cdF9yZWNvbm5lY3QocmVhc29uOnN0cmluZyl7XHJcblx0XHR0aGlzLl9zZXRDb25uZWN0ZWQoZmFsc2UpO1xyXG5cdFx0aWYodGhpcy5yZWNvbm5lY3RfZHBjKSB7XHJcblx0XHRcdGNsZWFyRFBDKHRoaXMucmVjb25uZWN0X2RwYyk7XHJcblx0XHRcdGRlbGV0ZSB0aGlzLnJlY29ubmVjdF9kcGM7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5jbGVhclBlbmRpbmcocmVhc29uKTtcclxuXHRcdGRlbGV0ZSB0aGlzLnN0cmVhbTtcclxuXHRcdC8vZGVsZXRlIHRoaXMuY2xpZW50O1xyXG5cdFx0aWYodGhpcy5yZWNvbm5lY3QpIHtcclxuXHRcdFx0dGhpcy5yZWNvbm5lY3RfZHBjID0gZHBjKDEwMDAsICgpID0+IHtcclxuXHRcdFx0XHR0aGlzLl9jb25uZWN0Q2xpZW50KCk7XHJcblx0XHRcdH0pXHJcblx0XHR9XHJcblx0fVxyXG5cdGFzeW5jIF9jb25uZWN0Q2xpZW50KCl7XHJcblx0XHR0aGlzLmNsaWVudC53YWl0Rm9yUmVhZHkoMjUwMCwgKGNvbm5lY3RfZXJyb3I6YW55KT0+e1xyXG5cdFx0XHRcclxuXHRcdFx0aWYoY29ubmVjdF9lcnJvcil7XHJcblx0XHRcdFx0Ly9jb25zb2xlLmxvZyhcImNvbm5lY3RfZXJyb3JcIilcclxuXHRcdFx0XHQvL3RoaXMuY29ubmVjdGlvblBoYXNlID0gZmFsc2U7XHJcblx0XHRcdFx0dGhpcy5fcmVjb25uZWN0KCdjbGllbnQgY29ubmVjdCBkZWFkbGluZSByZWFjaGVkJyk7XHJcblx0XHRcdFx0cmV0dXJuIHJlc29sdmUoKTtcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0Y29uc29sZS5sb2coXCJjbGllbnQgY29ubmVjdGVkXCIpXHJcblxyXG5cdFx0XHR0aGlzLnN0cmVhbSA9IHRoaXMuY3JlYXRlU3RyZWFtKCk7XHJcblx0XHRcdHRoaXMuaW5pdEludGFrZSh0aGlzLnN0cmVhbSk7XHJcblx0XHRcdFxyXG5cdFx0XHR0aGlzLnN0cmVhbS5vbignZXJyb3InLCAoZXJyb3I6YW55KSA9PiB7XHJcblx0XHRcdFx0Ly8gY29uc29sZS5sb2coXCJjbGllbnQ6XCIsZXJyb3IpO1xyXG5cdFx0XHRcdHRoaXMuZXJyb3JDQnMuZm9yRWFjaChmbj0+Zm4oZXJyb3IudG9TdHJpbmcoKSwgZXJyb3IpKTtcclxuXHRcdFx0XHR0aGlzLnZlcmJvc2UgJiYgdGhpcy5sb2coJ3N0cmVhbTplcnJvcicsIGVycm9yKTtcclxuXHRcdFx0XHR0aGlzLl9yZWNvbm5lY3QoZXJyb3IpO1xyXG5cdFx0XHR9KVxyXG5cdFx0XHR0aGlzLnN0cmVhbS5vbignZW5kJywgKC4uLmFyZ3M6YW55KSA9PiB7XHJcblx0XHRcdFx0dGhpcy52ZXJib3NlICYmIHRoaXMubG9nKCdzdHJlYW06ZW5kJywgLi4uYXJncyk7XHJcblx0XHRcdFx0dGhpcy5fcmVjb25uZWN0KCdzdHJlYW0gZW5kJyk7XHJcblx0XHRcdH0pO1xyXG5cclxuXHRcdFx0aWYodGhpcy5kaXNhYmxlQ29ubmVjdGlvbkNoZWNrKVxyXG5cdFx0XHRcdHJldHVybiByZXNvbHZlKCk7XHJcblx0XHRcdFxyXG5cdFx0XHRkcGMoMTAwLCBhc3luYygpPT57XHJcblx0XHRcdFx0bGV0IHJlc3BvbnNlOmFueSA9IGF3YWl0IHRoaXMuY2FsbCgnZ2V0VmlydHVhbFNlbGVjdGVkUGFyZW50Qmx1ZVNjb3JlUmVxdWVzdCcsIHt9KVxyXG5cdFx0XHRcdC5jYXRjaChlPT57XHJcblx0XHRcdFx0XHR0aGlzLmNvbm5lY3RGYWlsdXJlQ0JzLmZvckVhY2goZm49PmZuKGUpKTtcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdHRoaXMudmVyYm9zZSAmJiB0aGlzLmxvZyhcImdldFZpcnR1YWxTZWxlY3RlZFBhcmVudEJsdWVTY29yZVJlcXVlc3Q6cmVzcG9uc2VcIiwgcmVzcG9uc2UpXHJcblx0XHRcdFx0aWYocmVzcG9uc2UgJiYgcmVzcG9uc2UuYmx1ZVNjb3JlKXtcclxuXHRcdFx0XHRcdHRoaXMuX3NldENvbm5lY3RlZCh0cnVlKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cmVzb2x2ZSgpO1xyXG5cdFx0XHR9KVxyXG5cdFx0fSlcclxuXHR9XHJcblxyXG5cdF9zZXRDb25uZWN0ZWQoaXNDb25uZWN0ZWQ6Ym9vbGVhbil7XHJcblx0XHRpZih0aGlzLmlzQ29ubmVjdGVkID09IGlzQ29ubmVjdGVkKVxyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR0aGlzLmlzQ29ubmVjdGVkID0gaXNDb25uZWN0ZWQ7XHJcblxyXG5cdFx0bGV0IGNicyA9IGlzQ29ubmVjdGVkP3RoaXMuY29ubmVjdENCczp0aGlzLmRpc2Nvbm5lY3RDQnM7XHJcblx0XHQvL2NvbnNvbGUubG9nKFwidGhpcy5pc0Nvbm5lY3RlZFwiLCB0aGlzLmlzQ29ubmVjdGVkLCBjYnMpXHJcblx0XHRjYnMuZm9yRWFjaChmbj0+e1xyXG5cdFx0XHRmbigpO1xyXG5cdFx0fSlcclxuXHR9XHJcblxyXG5cdG9uQ29ubmVjdChjYWxsYmFjazpGdW5jdGlvbil7XHJcblx0XHR0aGlzLmNvbm5lY3RDQnMucHVzaChjYWxsYmFjaylcclxuXHRcdGlmKHRoaXMuaXNDb25uZWN0ZWQpXHJcblx0XHRcdGNhbGxiYWNrKCk7XHJcblx0fVxyXG5cdG9uQ29ubmVjdEZhaWx1cmUoY2FsbGJhY2s6RnVuY3Rpb24pe1xyXG5cdFx0dGhpcy5jb25uZWN0RmFpbHVyZUNCcy5wdXNoKGNhbGxiYWNrKVxyXG5cdH1cclxuXHRvbkVycm9yKGNhbGxiYWNrOkZ1bmN0aW9uKXtcclxuXHRcdHRoaXMuZXJyb3JDQnMucHVzaChjYWxsYmFjaylcclxuXHR9XHJcblx0b25EaXNjb25uZWN0KGNhbGxiYWNrOkZ1bmN0aW9uKXtcclxuXHRcdHRoaXMuZGlzY29ubmVjdENCcy5wdXNoKGNhbGxiYWNrKVxyXG5cdH1cclxuXHJcblx0ZGlzY29ubmVjdCgpIHtcclxuXHRcdGlmKHRoaXMucmVjb25uZWN0X2RwYykge1xyXG5cdFx0XHRjbGVhckRQQyh0aGlzLnJlY29ubmVjdF9kcGMpO1xyXG5cdFx0XHRkZWxldGUgdGhpcy5yZWNvbm5lY3RfZHBjO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy5yZWNvbm5lY3QgPSBmYWxzZTtcclxuXHRcdHRoaXMuc3RyZWFtICYmIHRoaXMuc3RyZWFtLmVuZCgpO1xyXG5cdFx0dGhpcy5jbGVhclBlbmRpbmcoKTtcclxuXHR9XHJcblxyXG5cdGNsZWFyUGVuZGluZyhyZWFzb24/OnN0cmluZykge1xyXG5cdFx0T2JqZWN0LmtleXModGhpcy5wZW5kaW5nKS5mb3JFYWNoKGtleSA9PiB7XHJcblx0XHRcdGxldCBsaXN0ID0gdGhpcy5wZW5kaW5nW2tleV07XHJcblx0XHRcdGxpc3QuZm9yRWFjaChvPT5vLnJlamVjdChyZWFzb258fCdjbG9zaW5nIGJ5IGZvcmNlJykpO1xyXG5cdFx0XHR0aGlzLnBlbmRpbmdba2V5XSA9IFtdO1xyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRjbG9zZSgpIHtcclxuXHRcdHRoaXMuZGlzY29ubmVjdCgpXHJcblx0fVxyXG5cclxuXHRjcmVhdGVTdHJlYW0oKSB7XHJcblx0XHRpZighdGhpcy5jbGllbnQpXHJcblx0XHRcdHJldHVybiBudWxsO1xyXG5cdFx0Y29uc3Qgc3RyZWFtID0gdGhpcy5jbGllbnQuTWVzc2FnZVN0cmVhbSgoKT0+e1xyXG5cdFx0fSk7XHJcblx0XHQvL2NvbnNvbGUubG9nKFwic3RyZWFtXCIsIHN0cmVhbSlcclxuXHRcdHJldHVybiBzdHJlYW07XHJcblx0fVxyXG5cclxuXHRpbml0SW50YWtlKHN0cmVhbTpJU3RyZWFtKSB7XHJcblx0XHRzdHJlYW0ub24oJ2RhdGEnLCAoZGF0YTphbnkpID0+IHtcclxuXHRcdFx0Ly90aGlzLmxvZyhcInN0cmVhbTpkYXRhXCIsIGRhdGEpXHJcblx0XHRcdGlmKGRhdGEucGF5bG9hZCkge1xyXG5cdFx0XHRcdGxldCBuYW1lID0gZGF0YS5wYXlsb2FkO1xyXG5cdFx0XHRcdGxldCBwYXlsb2FkID0gZGF0YVtuYW1lXTtcclxuXHRcdFx0XHRsZXQgaWRlbnQgPSBuYW1lLnJlcGxhY2UoL15nZXR8UmVzcG9uc2UkL2lnLCcnKS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0XHRcdHRoaXMuaGFuZGxlSW50YWtlKHtuYW1lLCBwYXlsb2FkLCBpZGVudCB9KTtcclxuXHRcdFx0fVxyXG5cdFx0fSk7XHJcblx0fVxyXG5cclxuXHRoYW5kbGVJbnRha2UobzpJRGF0YSkge1xyXG5cdFx0aWYodGhpcy5pbnRha2VIYW5kbGVyKSB7XHJcblx0XHRcdHRoaXMuaW50YWtlSGFuZGxlcihvKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdGxldCBoYW5kbGVycyA9IHRoaXMucGVuZGluZ1tvLm5hbWVdO1xyXG5cdFx0XHR0aGlzLnZlcmJvc2UgJiYgY29uc29sZS5sb2coJ2ludGFrZTonLG8sJ2hhbmRsZXJzOicsaGFuZGxlcnMpO1xyXG5cdFx0XHQvL2lmKG8ubmFtZSA9PSAnZ2V0VXR4b3NCeUFkZHJlc3Nlc1Jlc3BvbnNlJyl7XHJcblx0XHRcdC8vXHRjb25zb2xlLmxvZyhKU09OLnN0cmluZ2lmeShvLCBudWxsLCBcIiAgXCIpKTtcclxuXHRcdFx0Ly99XHJcblx0XHRcdGlmKGhhbmRsZXJzICYmIGhhbmRsZXJzLmxlbmd0aCl7XHJcblx0XHRcdFx0bGV0IHBlbmRpbmc6UXVldWVJdGVtfHVuZGVmaW5lZCA9IGhhbmRsZXJzLnNoaWZ0KCk7XHJcblx0XHRcdFx0aWYocGVuZGluZylcclxuXHRcdFx0XHRcdHBlbmRpbmcucmVzb2x2ZShvLnBheWxvYWQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRsZXQgc3Vic2NyaWJlcnM6U3Vic2NyaWJlckl0ZW1bXXx1bmRlZmluZWQgPSB0aGlzLnN1YnNjcmliZXJzLmdldChvLm5hbWUpO1xyXG5cdFx0XHQvL3RoaXMubG9nKFwiaGFuZGxlSW50YWtlOm8ubmFtZTpcIiwgby5uYW1lLCBzdWJzY3JpYmVycylcclxuXHRcdFx0aWYoc3Vic2NyaWJlcnMpe1xyXG5cdFx0XHRcdHN1YnNjcmliZXJzLm1hcChzdWJzY3JpYmVyPT57XHJcblx0XHRcdFx0XHRzdWJzY3JpYmVyLmNhbGxiYWNrKG8ucGF5bG9hZClcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzZXRJbnRha2VIYW5kbGVyKGZuOkZ1bmN0aW9uKSB7XHJcblx0XHR0aGlzLmludGFrZUhhbmRsZXIgPSBmbjtcclxuXHR9XHJcblxyXG5cdHBvc3QobmFtZTpzdHJpbmcsIGFyZ3M6YW55PXsgfSkge1xyXG5cdFx0aWYoIXRoaXMuc3RyZWFtKVxyXG5cdFx0XHRyZXR1cm4gZmFsc2U7XHJcblxyXG5cdFx0bGV0IHJlcSA9IHtcclxuXHRcdFx0W25hbWVdOmFyZ3NcclxuXHRcdH1cclxuXHRcdHRoaXMudmVyYm9zZSAmJiB0aGlzLmxvZygncG9zdDonLHJlcSk7XHJcblx0XHR0aGlzLnN0cmVhbS53cml0ZShyZXEpO1xyXG5cclxuXHRcdHJldHVybiB0cnVlO1xyXG5cdH1cclxuXHJcblx0Y2FsbChtZXRob2Q6c3RyaW5nLCBkYXRhOmFueSkge1xyXG5cdFx0dGhpcy52ZXJib3NlICYmIHRoaXMubG9nKCdjYWxsIHRvJywgbWV0aG9kKTtcclxuXHRcdGlmKCF0aGlzLmNsaWVudClcclxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KCdub3QgY29ubmVjdGVkJyk7XHJcblxyXG5cdFx0cmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuXHRcdFx0bGV0IHN0cmVhbSA9IHRoaXMuc3RyZWFtO1xyXG5cdFx0XHRpZighc3RyZWFtKSB7XHJcblx0XHRcdFx0dGhpcy52ZXJib3NlICYmICB0aGlzLmxvZygnY291bGQgbm90IGNyZWF0ZSBzdHJlYW0nKTtcclxuXHRcdFx0XHRyZXR1cm4gcmVqZWN0KCdub3QgY29ubmVjdGVkJyk7XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGNvbnN0IHJlc3AgPSBtZXRob2QucmVwbGFjZSgvUmVxdWVzdCQvLCdSZXNwb25zZScpO1xyXG5cdFx0XHRpZighdGhpcy5wZW5kaW5nW3Jlc3BdKVxyXG5cdFx0XHRcdHRoaXMucGVuZGluZ1tyZXNwXSA9IFtdO1xyXG5cdFx0XHRsZXQgaGFuZGxlcnM6UXVldWVJdGVtW10gPSB0aGlzLnBlbmRpbmdbcmVzcF07XHJcblx0XHRcdGhhbmRsZXJzLnB1c2goe21ldGhvZCwgZGF0YSwgcmVzb2x2ZSwgcmVqZWN0fSk7XHJcblxyXG5cdFx0XHR0aGlzLnBvc3QobWV0aG9kLCBkYXRhKTtcclxuXHRcdH0pXHJcblx0fVxyXG5cclxuXHRzdWJzY3JpYmU8VD4oc3ViamVjdDpzdHJpbmcsIGRhdGE6YW55PXt9LCBjYWxsYmFjazpGdW5jdGlvbik6UnBjLlN1YlByb21pc2U8VD57XHJcblx0XHRpZih0eXBlb2YgZGF0YSA9PSAnZnVuY3Rpb24nKXtcclxuXHRcdFx0Y2FsbGJhY2sgPSBkYXRhO1xyXG5cdFx0XHRkYXRhID0ge307XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy52ZXJib3NlICYmIHRoaXMubG9nKCdzdWJzY3JpYmUgdG8nLCBzdWJqZWN0KTtcclxuXHRcdGlmKCF0aGlzLmNsaWVudClcclxuXHRcdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KCdub3QgY29ubmVjdGVkJykgYXMgUnBjLlN1YlByb21pc2U8VD47XHJcblxyXG5cdFx0bGV0IGV2ZW50TmFtZSA9IHRoaXMuc3ViamVjdDJFdmVudE5hbWUoc3ViamVjdCk7XHJcblx0XHR0aGlzLnZlcmJvc2UgJiYgdGhpcy5sb2coXCJzdWJzY3JpYmU6ZXZlbnROYW1lXCIsIGV2ZW50TmFtZSlcclxuXHJcblx0XHRsZXQgc3Vic2NyaWJlcnM6U3Vic2NyaWJlckl0ZW1bXXx1bmRlZmluZWQgPSB0aGlzLnN1YnNjcmliZXJzLmdldChldmVudE5hbWUpO1xyXG5cdFx0aWYoIXN1YnNjcmliZXJzKXtcclxuXHRcdFx0c3Vic2NyaWJlcnMgPSBbXTtcclxuXHRcdFx0dGhpcy5zdWJzY3JpYmVycy5zZXQoZXZlbnROYW1lLCBzdWJzY3JpYmVycyk7XHJcblx0XHR9XHJcblx0XHRsZXQgdWlkID0gKE1hdGgucmFuZG9tKCkqMTAwMDAwICsgRGF0ZS5ub3coKSkudG9GaXhlZCgwKTtcclxuXHRcdHN1YnNjcmliZXJzLnB1c2goe3VpZCwgY2FsbGJhY2t9KTtcclxuXHJcblx0XHRsZXQgcCA9IHRoaXMuY2FsbChzdWJqZWN0LCBkYXRhKSBhcyBScGMuU3ViUHJvbWlzZTxUPjtcclxuXHJcblx0XHRwLnVpZCA9IHVpZDtcclxuXHRcdHJldHVybiBwO1xyXG5cdH1cclxuXHJcblx0c3ViamVjdDJFdmVudE5hbWUoc3ViamVjdDpzdHJpbmcpe1xyXG5cdFx0bGV0IGV2ZW50TmFtZSA9IHN1YmplY3QucmVwbGFjZShcIm5vdGlmeVwiLCBcIlwiKS5yZXBsYWNlKFwiUmVxdWVzdFwiLCBcIk5vdGlmaWNhdGlvblwiKVxyXG5cdFx0cmV0dXJuIGV2ZW50TmFtZVswXS50b0xvd2VyQ2FzZSgpK2V2ZW50TmFtZS5zdWJzdHIoMSk7XHJcblx0fVxyXG5cclxuXHR1blN1YnNjcmliZShzdWJqZWN0OnN0cmluZywgdWlkOnN0cmluZz0nJyl7XHJcblx0XHRsZXQgZXZlbnROYW1lID0gdGhpcy5zdWJqZWN0MkV2ZW50TmFtZShzdWJqZWN0KTtcclxuXHRcdGxldCBzdWJzY3JpYmVyczpTdWJzY3JpYmVySXRlbVtdfHVuZGVmaW5lZCA9IHRoaXMuc3Vic2NyaWJlcnMuZ2V0KGV2ZW50TmFtZSk7XHJcblx0XHRpZighc3Vic2NyaWJlcnMpXHJcblx0XHRcdHJldHVyblxyXG5cdFx0aWYoIXVpZCl7XHJcblx0XHRcdHRoaXMuc3Vic2NyaWJlcnMuZGVsZXRlKGV2ZW50TmFtZSk7XHJcblx0XHR9ZWxzZXtcclxuXHRcdFx0c3Vic2NyaWJlcnMgPSBzdWJzY3JpYmVycy5maWx0ZXIoc3ViPT5zdWIudWlkIT11aWQpXHJcblx0XHRcdHRoaXMuc3Vic2NyaWJlcnMuc2V0KGV2ZW50TmFtZSwgc3Vic2NyaWJlcnMpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcbn1cclxuIl19