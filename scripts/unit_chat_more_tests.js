const ChatController = require('../controllers/ChatController');

async function call(message, session) {
  const req = { body: { message }, session: session || {} };
  const res = { json: (obj) => console.log(`Q: ${message}\n ->`, obj) };
  await ChatController.chat(req, res);
}

async function run() {
  await call('Hi');
  await call('How many available products?');
  await call('How many in my cart?'); // expects login
  await call('How to view order history?');
  await call('How many users?');
  await call("Is apples in stock?");

  // simulate logged-in user with id=1
  await call('How many in my cart?', { user: { id: 1, role: 'user' } });
  await call('How many users?', { user: { id: 1, role: 'admin' } });
}

run().catch(err => console.error(err));
