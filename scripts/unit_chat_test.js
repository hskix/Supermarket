const ChatController = require('../controllers/ChatController');

async function run() {
  const req = { body: { message: 'hello' } };
  const res = {
    json: (obj) => {
      console.log('res.json ->', obj);
    }
  };

  await ChatController.chat(req, res);
}

run().catch(err => console.error(err));
