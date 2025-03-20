const connect = require('./helper').connect;
const usersCollection = 'users';

exports.findUser = async function (username) {
  const collection = await connect(usersCollection);
  return collection.findOne({ username: { $eq: username } });
};

exports.getUsers = async function (query) {
  console.log(`Getting users for query= ${JSON.stringify(query)}`);
  const collection = await connect(usersCollection);
  return collection.find(query, { password: 0 }).toArray();
};

exports.deleteUser = async function (username) {
  const collection = await connect(usersCollection);
  return collection.deleteOne({ username: username });
};

exports.createUser = async function (data) {
  data.username = data.username.toLowerCase();
  const collection = await connect(usersCollection);
  return collection.insertOne(data);
};

exports.updateUser = async (user) => {
  user.username = user.username.toLowerCase();
  
  // Ensure MFA fields exist if not present
  if (user.mfaEnabled === undefined) {
    user.mfaEnabled = false;
  }
  if (user.mfaSecret === undefined) {
    user.mfaSecret = null;
  }
  
  const options = { upsert: true };
  const collection = await connect(usersCollection);
  await collection.updateOne({ username: user.username }, { $set: user }, options);
};
