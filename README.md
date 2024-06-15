# Zua gRPC interface

Zua gRPC module is a basic request/response wrapper for interfacing with [Zuad](https://github.com/zuanet/zuad)

## Installing zua-grpc

```
npm install -g @zua/grpc
```

## Cloning zua-grpc

```
git clone https://github.com/zuanet/node-zua-grpc
cd node-zua-grpc
npm install
```

## Example

```js
const { Client } = require('@zua/grpc');

const client = new Client({
    host:"127.0.0.1:42210"
});
client.connect();
client.verbose = true;

try {
    let response = await client.call('getMempoolEntriesRequest', { });
    console.log(response);
} catch(ex) {
    ...
}

client.call('getVirtualSelectedParentBlueScoreRequest', { }).then((response)=>{
    console.log(response);
}).catch((err)=>{
    console.log('error:',err);
})
```
