// netlify/functions/signaling.js

// Ephemeral in-memory storage (only for demo or low-traffic use)
let rooms = {};

exports.handler = async (event) => {
  const { httpMethod, queryStringParameters, body } = event;
  const roomId = queryStringParameters && queryStringParameters.room;

  if (!roomId) {
    return {
      statusCode: 400,
      body: 'Missing room parameter'
    };
  }

  if (httpMethod === 'GET') {
    if (rooms[roomId]) {
      return {
        statusCode: 200,
        body: JSON.stringify(rooms[roomId])
      };
    } else {
      return {
        statusCode: 404,
        body: 'Room not found'
      };
    }
  } else if (httpMethod === 'POST') {
    try {
      const data = JSON.parse(body);
      if (!data.room || !data.type || !data.sdp) {
        return {
          statusCode: 400,
          body: 'Missing required fields'
        };
      }
      
      if (!rooms[data.room]) {
        rooms[data.room] = {};
      }
      rooms[data.room][data.type] = data.sdp;
      
      return {
        statusCode: 200,
        body: `${data.type} stored for room ${data.room}`
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: 'Error processing data'
      };
    }
  } else {
    return {
      statusCode: 400,
      body: 'Unsupported operation'
    };
  }
};
