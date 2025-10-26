// you/server/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Sequelize, DataTypes } from 'sequelize';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Connection (SQLite)
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DATABASE_URL.replace('sqlite:', ''),
  logging: false,
});

// Define User Model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  // You can add more fields here like roles, profile info, etc.
});

// Synchronize Database
async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    // Sync all models (creates tables if they don't exist)
    await sequelize.sync();
    console.log('Database synchronized.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

// Basic Route
app.get('/', (req, res) => {
  res.send('You Backend Server is Running!');
});

// Import Routers
import { authRouter } from './auth.js';
import { dataRouter } from './data.js';

// Use Routers
app.use('/api/auth', authRouter);
app.use('/api/data', dataRouter);

// Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
});

// Define Data Model (Example: Notes/Todos)
const Note = sequelize.define('Note', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

// Note: In a real app, you would define associations here, e.g.,
// User.hasMany(Note, { foreignKey: 'userId' });
// Note.belongsTo(User, { foreignKey: 'userId' });

export { sequelize, User, Note };

