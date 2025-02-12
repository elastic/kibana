import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { createTransport } from './in_memory_transport';

describe('InMemoryTransport', () => {
  test('should start then close cleanly', async () => {
    const { clientTransport: client, serverTransport: server } = createTransport();
    
    client.onerror = (error: Error) => {
      throw error;
    };

    let clientDidClose = false;
    client.onclose = () => {
      clientDidClose = true;
    };

    let serverDidClose = false;
    server.onclose = () => {
      serverDidClose = true;
    };

    await client.start();
    await server.start();
    
    expect(clientDidClose).toBeFalsy();
    expect(serverDidClose).toBeFalsy();
    
    await client.close();
    await server.close();
    
    expect(clientDidClose).toBeTruthy();
    expect(serverDidClose).toBeTruthy();
  });

  test('should send and receive messages between client and server', async () => {
    const { clientTransport: client, serverTransport: server } = createTransport();
    
    client.onerror = (error) => {
      throw error;
    };
    
    server.onerror = (error) => {
      throw error;
    };

    const clientMessages: JSONRPCMessage[] = [];
    const serverMessages: JSONRPCMessage[] = [];

    client.onmessage = (message) => {
      clientMessages.push(message);
    };

    server.onmessage = (message) => {
      serverMessages.push(message);
      // Echo the message back to the client
      server.send(message);
    };

    const testMessages: JSONRPCMessage[] = [
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'ping',
      },
      {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      },
    ];

    await client.start();
    await server.start();

    // Send messages from client to server
    await client.send(testMessages[0]);
    await client.send(testMessages[1]);

    // Wait for all async operations to complete
    await new Promise(process.nextTick);

    // Server should have received both messages
    expect(serverMessages).toEqual(testMessages);
    
    // Client should have received the echoed messages
    expect(clientMessages).toEqual(testMessages);

    await client.close();
    await server.close();
  });

  test('should handle message callbacks correctly', async () => {
    const { clientTransport: client, serverTransport: server } = createTransport();

    
    await client.start();
    await server.start();

    // Set up server to respond to ping with pong
    server.onmessage = (message: any) => {
      if (message.method === 'ping') {
        server.send({
          jsonrpc: '2.0',
          id: message.id,
          result: 'pong',
        } as any);
      }
    };

    // Send ping and wait for pong
    const response = await new Promise<JSONRPCMessage>((resolve) => {
      client.onmessage = (message) => {
        resolve(message);
      };
      
      client.send({
        jsonrpc: '2.0',
        id: 123,
        method: 'ping',
      });
    });

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 123,
      result: 'pong',
    });

    await client.close();
    await server.close();
  });

  test('should handle errors correctly', async () => {
    const { clientTransport: client, serverTransport: server } = createTransport();
    
    await client.start();
    await server.start();

    // Set up server to respond with an error
    server.onmessage = (message) => {
      server.send({
        jsonrpc: '2.0',
        id: 456,
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
      });
    };

    // Send request and wait for error response
    const response = await new Promise<JSONRPCMessage>((resolve) => {
      client.onmessage = (message) => {
        resolve(message);
      };
      
      client.send({
        jsonrpc: '2.0',
        id: 456,
        method: 'invalid_method',
      });
    });

    expect(response).toEqual({
      jsonrpc: '2.0',
      id: 456,
      error: {
        code: -32600,
        message: 'Invalid Request',
      },
    });

    await client.close();
    await server.close();
  });
});
