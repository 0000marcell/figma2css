console.log('stdin: ', process.stdin);
let string = "{ id: 'testing'}";
let json = JSON.parse(string);
console.log(json.id);
