var socket = io.connect();
var client = new venaclient.Client(socket);

setupCounters(client);
setupFeed(client);