import { MongoClient } from "mongodb";

export const ConnectMongo = async () => {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    throw new Error(
      "Missing MONGODB_URI environment variable."
    );
  }

  const mongoDB = process.env.MONGODB_DB;
  if (!mongoDB) {
    throw new Error(
      "Missing MONGODB_DB environment variable."
    );
  }

  // Establish Mongo
  const client = await MongoClient.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  console.log("Connected to MongoDB.");

  return client;
};
