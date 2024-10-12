"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPC = exports.Client = void 0;
const grpc_1 = require("@zua/grpc");
Object.defineProperty(exports, "Client", { enumerable: true, get: function () { return grpc_1.Client; } });
class RPC {
    constructor(options = {}) {
        if (options.client) {
            this.client = options.client;
        }
        else {
            this.client = new grpc_1.Client(options.clientConfig || {});
            this.client.connect();
        }
    }
    onConnect(callback) {
        this.client.onConnect(callback);
    }
    onConnectFailure(callback) {
        this.client.onConnectFailure(callback);
    }
    onError(callback) {
        this.client.onError(callback);
    }
    onDisconnect(callback) {
        this.client.onDisconnect(callback);
    }
    disconnect() {
        var _a;
        (_a = this.client) === null || _a === void 0 ? void 0 : _a.disconnect();
    }
    connect() {
        var _a;
        return (_a = this.client) === null || _a === void 0 ? void 0 : _a.connect();
    }
    unSubscribe(method, uid = '') {
        return this.client.unSubscribe(method, uid);
    }
    subscribe(method, data, callback) {
        return this.client.subscribe(method, data, callback);
    }
    request(method, data) {
        return this.client.call(method, data);
    }
    subscribeChainChanged(callback) {
        return this.subscribe("notifyChainChangedRequest", {}, callback);
    }
    subscribeBlockAdded(callback) {
        return this.subscribe("notifyBlockAddedRequest", {}, callback);
    }
    subscribeVirtualSelectedParentBlueScoreChanged(callback) {
        return this.subscribe("notifyVirtualSelectedParentBlueScoreChangedRequest", {}, callback);
    }
    subscribeUtxosChanged(addresses, callback) {
        return this.subscribe("notifyUtxosChangedRequest", { addresses }, callback);
    }
    unSubscribeUtxosChanged(uid = '') {
        this.unSubscribe("notifyUtxosChangedRequest", uid);
    }
    getBlock(hash, includeTransactions = true) {
        return this.request('getBlockRequest', { hash, includeTransactions });
    }
    getTransactionsByAddresses(startingBlockHash, addresses) {
        return this.request('getTransactionsByAddressesRequest', {
            startingBlockHash, addresses
        });
    }
    getUtxosByAddresses(addresses) {
        return this.request('getUtxosByAddressesRequest', { addresses });
    }
    submitTransaction(tx) {
        return this.request('submitTransactionRequest', tx);
    }
    getVirtualSelectedParentBlueScore() {
        return this.request('getVirtualSelectedParentBlueScoreRequest', {});
    }
    getBlockDagInfo() {
        return this.request('getBlockDagInfoRequest', {});
    }
    subscribeVirtualDaaScoreChanged(callback) {
        return this.subscribe("notifyVirtualDaaScoreChangedRequest", {}, callback);
    }
}
exports.RPC = RPC;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnBjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vbGliL3JwYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxzQ0FBbUM7QUFHM0IsdUZBSEEsYUFBTSxPQUdBO0FBQ2QsTUFBYSxHQUFHO0lBRWYsWUFBWSxVQUFZLEVBQUU7UUFDekIsSUFBRyxPQUFPLENBQUMsTUFBTSxFQUFDO1lBQ2pCLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztTQUM3QjthQUFJO1lBQ0osSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGFBQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxJQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7U0FDdEI7SUFDRixDQUFDO0lBQ0QsU0FBUyxDQUFDLFFBQWlCO1FBQzFCLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2pDLENBQUM7SUFDRCxnQkFBZ0IsQ0FBQyxRQUFpQjtRQUNqQyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFDRCxPQUFPLENBQUMsUUFBaUI7UUFDeEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUNELFlBQVksQ0FBQyxRQUFpQjtRQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBQ0QsVUFBVTs7UUFDVCxNQUFBLElBQUksQ0FBQyxNQUFNLDBDQUFFLFVBQVUsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFDRCxPQUFPOztRQUNOLE9BQU8sTUFBQSxJQUFJLENBQUMsTUFBTSwwQ0FBRSxPQUFPLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBQ0QsV0FBVyxDQUFDLE1BQWEsRUFBRSxNQUFXLEVBQUU7UUFDdkMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUNELFNBQVMsQ0FBTyxNQUFhLEVBQUUsSUFBUSxFQUFFLFFBQXdCO1FBQ2hFLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUksTUFBTSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN6RCxDQUFDO0lBQ0QsT0FBTyxDQUFJLE1BQWEsRUFBRSxJQUFRO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBZSxDQUFDO0lBQ3JELENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxRQUFtRDtRQUN4RSxPQUFPLElBQUksQ0FBQyxTQUFTLENBQStELDJCQUEyQixFQUFFLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUNoSSxDQUFDO0lBQ0QsbUJBQW1CLENBQUMsUUFBaUQ7UUFDcEUsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUEyRCx5QkFBeUIsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDMUgsQ0FBQztJQUNELDhDQUE4QyxDQUFDLFFBQTRFO1FBQzFILE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBaUgsb0RBQW9ELEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzNNLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxTQUFrQixFQUFFLFFBQW1EO1FBQzVGLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBK0QsMkJBQTJCLEVBQUUsRUFBQyxTQUFTLEVBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztJQUN6SSxDQUFDO0lBRUQsdUJBQXVCLENBQUMsTUFBVyxFQUFFO1FBQ3BDLElBQUksQ0FBQyxXQUFXLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDcEQsQ0FBQztJQUVELFFBQVEsQ0FBQyxJQUFXLEVBQUUsc0JBQTRCLElBQUk7UUFDckQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFvQixpQkFBaUIsRUFBRSxFQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBQyxDQUFDLENBQUM7SUFDeEYsQ0FBQztJQUNELDBCQUEwQixDQUFDLGlCQUF3QixFQUFFLFNBQWtCO1FBQ3RFLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBc0MsbUNBQW1DLEVBQUU7WUFDN0YsaUJBQWlCLEVBQUUsU0FBUztTQUM1QixDQUFDLENBQUM7SUFDSixDQUFDO0lBQ0QsbUJBQW1CLENBQUMsU0FBa0I7UUFDckMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUErQiw0QkFBNEIsRUFBRSxFQUFDLFNBQVMsRUFBQyxDQUFDLENBQUM7SUFDOUYsQ0FBQztJQUNELGlCQUFpQixDQUFDLEVBQWdDO1FBQ2pELE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBZ0MsMEJBQTBCLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDcEYsQ0FBQztJQUVELGlDQUFpQztRQUNoQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQTZDLDBDQUEwQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ2pILENBQUM7SUFDRCxlQUFlO1FBQ2QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUE4Qix3QkFBd0IsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUNoRixDQUFDO0lBQ0QsK0JBQStCLENBQUMsUUFBNkQ7UUFDNUYsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFtRixxQ0FBcUMsRUFBRSxFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDOUosQ0FBQztDQUVEO0FBakZELGtCQWlGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpZW50fSBmcm9tICdAa2FzcGEvZ3JwYyc7XHJcbmltcG9ydCB7SVJQQywgUlBDIGFzIFJwY30gZnJvbSAnLi4vdHlwZXMvY3VzdG9tLXR5cGVzJztcclxuXHJcbmV4cG9ydCB7Q2xpZW50fTtcclxuZXhwb3J0IGNsYXNzIFJQQyBpbXBsZW1lbnRzIElSUEN7XHJcblx0Y2xpZW50OkNsaWVudDtcclxuXHRjb25zdHJ1Y3RvcihvcHRpb25zOmFueT17fSl7XHJcblx0XHRpZihvcHRpb25zLmNsaWVudCl7XHJcblx0XHRcdHRoaXMuY2xpZW50ID0gb3B0aW9ucy5jbGllbnQ7XHJcblx0XHR9ZWxzZXtcclxuXHRcdFx0dGhpcy5jbGllbnQgPSBuZXcgQ2xpZW50KG9wdGlvbnMuY2xpZW50Q29uZmlnfHx7fSk7XHJcblx0XHRcdHRoaXMuY2xpZW50LmNvbm5lY3QoKTtcclxuXHRcdH1cclxuXHR9XHJcblx0b25Db25uZWN0KGNhbGxiYWNrOkZ1bmN0aW9uKXtcclxuXHRcdHRoaXMuY2xpZW50Lm9uQ29ubmVjdChjYWxsYmFjayk7XHJcblx0fVxyXG5cdG9uQ29ubmVjdEZhaWx1cmUoY2FsbGJhY2s6RnVuY3Rpb24pe1xyXG5cdFx0dGhpcy5jbGllbnQub25Db25uZWN0RmFpbHVyZShjYWxsYmFjayk7XHJcblx0fVxyXG5cdG9uRXJyb3IoY2FsbGJhY2s6RnVuY3Rpb24pe1xyXG5cdFx0dGhpcy5jbGllbnQub25FcnJvcihjYWxsYmFjayk7XHJcblx0fVxyXG5cdG9uRGlzY29ubmVjdChjYWxsYmFjazpGdW5jdGlvbil7XHJcblx0XHR0aGlzLmNsaWVudC5vbkRpc2Nvbm5lY3QoY2FsbGJhY2spO1xyXG5cdH1cclxuXHRkaXNjb25uZWN0KCl7XHJcblx0XHR0aGlzLmNsaWVudD8uZGlzY29ubmVjdCgpO1xyXG5cdH1cclxuXHRjb25uZWN0KCl7XHJcblx0XHRyZXR1cm4gdGhpcy5jbGllbnQ/LmNvbm5lY3QoKTtcclxuXHR9XHJcblx0dW5TdWJzY3JpYmUobWV0aG9kOnN0cmluZywgdWlkOnN0cmluZz0nJyl7XHJcblx0XHRyZXR1cm4gdGhpcy5jbGllbnQudW5TdWJzY3JpYmUobWV0aG9kLCB1aWQpO1xyXG5cdH1cclxuXHRzdWJzY3JpYmU8VCwgUj4obWV0aG9kOnN0cmluZywgZGF0YTphbnksIGNhbGxiYWNrOlJwYy5jYWxsYmFjazxSPil7XHJcblx0XHRyZXR1cm4gdGhpcy5jbGllbnQuc3Vic2NyaWJlPFQ+KG1ldGhvZCwgZGF0YSwgY2FsbGJhY2spO1xyXG5cdH1cclxuXHRyZXF1ZXN0PFQ+KG1ldGhvZDpzdHJpbmcsIGRhdGE6YW55KXtcclxuXHRcdHJldHVybiB0aGlzLmNsaWVudC5jYWxsKG1ldGhvZCwgZGF0YSkgYXMgUHJvbWlzZTxUPjtcclxuXHR9XHJcblxyXG5cdHN1YnNjcmliZUNoYWluQ2hhbmdlZChjYWxsYmFjazpScGMuY2FsbGJhY2s8UnBjLkNoYWluQ2hhbmdlZE5vdGlmaWNhdGlvbj4pe1xyXG5cdFx0cmV0dXJuIHRoaXMuc3Vic2NyaWJlPFJwYy5Ob3RpZnlDaGFpbkNoYW5nZWRSZXNwb25zZSwgUnBjLkNoYWluQ2hhbmdlZE5vdGlmaWNhdGlvbj4oXCJub3RpZnlDaGFpbkNoYW5nZWRSZXF1ZXN0XCIsIHt9LCBjYWxsYmFjayk7XHJcblx0fVxyXG5cdHN1YnNjcmliZUJsb2NrQWRkZWQoY2FsbGJhY2s6UnBjLmNhbGxiYWNrPFJwYy5CbG9ja0FkZGVkTm90aWZpY2F0aW9uPil7XHJcblx0XHRyZXR1cm4gdGhpcy5zdWJzY3JpYmU8UnBjLk5vdGlmeUJsb2NrQWRkZWRSZXNwb25zZSwgUnBjLkJsb2NrQWRkZWROb3RpZmljYXRpb24+KFwibm90aWZ5QmxvY2tBZGRlZFJlcXVlc3RcIiwge30sIGNhbGxiYWNrKTtcclxuXHR9XHJcblx0c3Vic2NyaWJlVmlydHVhbFNlbGVjdGVkUGFyZW50Qmx1ZVNjb3JlQ2hhbmdlZChjYWxsYmFjazpScGMuY2FsbGJhY2s8UnBjLlZpcnR1YWxTZWxlY3RlZFBhcmVudEJsdWVTY29yZUNoYW5nZWROb3RpZmljYXRpb24+KXtcclxuXHRcdHJldHVybiB0aGlzLnN1YnNjcmliZTxScGMuTm90aWZ5VmlydHVhbFNlbGVjdGVkUGFyZW50Qmx1ZVNjb3JlQ2hhbmdlZFJlc3BvbnNlLCBScGMuVmlydHVhbFNlbGVjdGVkUGFyZW50Qmx1ZVNjb3JlQ2hhbmdlZE5vdGlmaWNhdGlvbj4oXCJub3RpZnlWaXJ0dWFsU2VsZWN0ZWRQYXJlbnRCbHVlU2NvcmVDaGFuZ2VkUmVxdWVzdFwiLCB7fSwgY2FsbGJhY2spO1xyXG5cdH1cclxuXHJcblx0c3Vic2NyaWJlVXR4b3NDaGFuZ2VkKGFkZHJlc3NlczpzdHJpbmdbXSwgY2FsbGJhY2s6UnBjLmNhbGxiYWNrPFJwYy5VdHhvc0NoYW5nZWROb3RpZmljYXRpb24+KXtcclxuXHRcdHJldHVybiB0aGlzLnN1YnNjcmliZTxScGMuTm90aWZ5VXR4b3NDaGFuZ2VkUmVzcG9uc2UsIFJwYy5VdHhvc0NoYW5nZWROb3RpZmljYXRpb24+KFwibm90aWZ5VXR4b3NDaGFuZ2VkUmVxdWVzdFwiLCB7YWRkcmVzc2VzfSwgY2FsbGJhY2spO1xyXG5cdH1cclxuXHJcblx0dW5TdWJzY3JpYmVVdHhvc0NoYW5nZWQodWlkOnN0cmluZz0nJyl7XHJcblx0XHR0aGlzLnVuU3Vic2NyaWJlKFwibm90aWZ5VXR4b3NDaGFuZ2VkUmVxdWVzdFwiLCB1aWQpO1xyXG5cdH1cclxuXHJcblx0Z2V0QmxvY2soaGFzaDpzdHJpbmcsIGluY2x1ZGVUcmFuc2FjdGlvbnM6Ym9vbGVhbj10cnVlKXtcclxuXHRcdHJldHVybiB0aGlzLnJlcXVlc3Q8UnBjLkJsb2NrUmVzcG9uc2U+KCdnZXRCbG9ja1JlcXVlc3QnLCB7aGFzaCwgaW5jbHVkZVRyYW5zYWN0aW9uc30pO1xyXG5cdH1cclxuXHRnZXRUcmFuc2FjdGlvbnNCeUFkZHJlc3NlcyhzdGFydGluZ0Jsb2NrSGFzaDpzdHJpbmcsIGFkZHJlc3NlczpzdHJpbmdbXSl7XHJcblx0XHRyZXR1cm4gdGhpcy5yZXF1ZXN0PFJwYy5UcmFuc2FjdGlvbnNCeUFkZHJlc3Nlc1Jlc3BvbnNlPignZ2V0VHJhbnNhY3Rpb25zQnlBZGRyZXNzZXNSZXF1ZXN0Jywge1xyXG5cdFx0XHRzdGFydGluZ0Jsb2NrSGFzaCwgYWRkcmVzc2VzXHJcblx0XHR9KTtcclxuXHR9XHJcblx0Z2V0VXR4b3NCeUFkZHJlc3NlcyhhZGRyZXNzZXM6c3RyaW5nW10pe1xyXG5cdFx0cmV0dXJuIHRoaXMucmVxdWVzdDxScGMuVVRYT3NCeUFkZHJlc3Nlc1Jlc3BvbnNlPignZ2V0VXR4b3NCeUFkZHJlc3Nlc1JlcXVlc3QnLCB7YWRkcmVzc2VzfSk7XHJcblx0fVxyXG5cdHN1Ym1pdFRyYW5zYWN0aW9uKHR4OiBScGMuU3VibWl0VHJhbnNhY3Rpb25SZXF1ZXN0KXtcclxuXHRcdHJldHVybiB0aGlzLnJlcXVlc3Q8UnBjLlN1Ym1pdFRyYW5zYWN0aW9uUmVzcG9uc2U+KCdzdWJtaXRUcmFuc2FjdGlvblJlcXVlc3QnLCB0eCk7XHJcblx0fVxyXG5cclxuXHRnZXRWaXJ0dWFsU2VsZWN0ZWRQYXJlbnRCbHVlU2NvcmUoKXtcclxuXHRcdHJldHVybiB0aGlzLnJlcXVlc3Q8UnBjLlZpcnR1YWxTZWxlY3RlZFBhcmVudEJsdWVTY29yZVJlc3BvbnNlPignZ2V0VmlydHVhbFNlbGVjdGVkUGFyZW50Qmx1ZVNjb3JlUmVxdWVzdCcsIHt9KTtcclxuXHR9XHJcblx0Z2V0QmxvY2tEYWdJbmZvKCl7XHJcblx0XHRyZXR1cm4gdGhpcy5yZXF1ZXN0PFJwYy5HZXRCbG9ja0RhZ0luZm9SZXNwb25zZT4oJ2dldEJsb2NrRGFnSW5mb1JlcXVlc3QnLCB7fSk7XHJcblx0fVxyXG5cdHN1YnNjcmliZVZpcnR1YWxEYWFTY29yZUNoYW5nZWQoY2FsbGJhY2s6UnBjLmNhbGxiYWNrPFJwYy5WaXJ0dWFsRGFhU2NvcmVDaGFuZ2VkTm90aWZpY2F0aW9uPil7XHJcblx0XHRyZXR1cm4gdGhpcy5zdWJzY3JpYmU8UnBjLk5vdGlmeVZpcnR1YWxEYWFTY29yZUNoYW5nZWRSZXNwb25zZSwgUnBjLlZpcnR1YWxEYWFTY29yZUNoYW5nZWROb3RpZmljYXRpb24+KFwibm90aWZ5VmlydHVhbERhYVNjb3JlQ2hhbmdlZFJlcXVlc3RcIiwge30sIGNhbGxiYWNrKTtcclxuXHR9XHJcblxyXG59XHJcbiJdfQ==