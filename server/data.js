// you/server/data.js
import express from 'express';
import { authenticateToken } from './auth.js'; // Import authentication middleware


const router = express.Router();

// Define a simple Data Model (Example: Notes/Todos)
// We need to re-import sequelize and DataTypes if we want to define a new model here.
// Since we only exported User from server.js, let's assume we will define the Data model in server.js for simplicity
// or pass the sequelize instance/models from server.js.
// For now, let's define it here, assuming we can get the sequelize instance.

// To avoid circular dependency and complexity, let's redefine the model in server.js and import it,
// but for this phase, I'll keep the model definition simple and assume it's available.
// I will update server.js to export sequelize and DataTypes.

// For now, let's assume a simple model for "Notes" is available.
// I will update server.js in the next step.
// const Note = sequelize.define('Note', { ... });

// --- API Routes ---

// Import Note model
import { Note } from './server.js';

// Get all notes for the authenticated user
router.get('/notes', authenticateToken, async (req, res) => {
  try {
    const userNotes = await Note.findAll({ where: { userId: req.user.id } });
    res.json(userNotes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ message: 'Server error fetching notes' });
  }
});

// Create a new note
router.post('/notes', authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }

  try {
    const newNote = await Note.create({
      userId: req.user.id,
      title,
      content,
    });
    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ message: 'Server error creating note' });
  }
});

// Get a specific note
router.get('/notes/:id', authenticateToken, async (req, res) => {
  const noteId = req.params.id;

  try {
    const note = await Note.findOne({
      where: { id: noteId, userId: req.user.id },
    });

    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ message: 'Server error fetching note' });
  }
});

// Update a note
router.put('/notes/:id', authenticateToken, async (req, res) => {
  const noteId = req.params.id;
  const { title, content } = req.body;

  try {
    const [updatedRows] = await Note.update(
      { title, content },
      { where: { id: noteId, userId: req.user.id } }
    );

    if (updatedRows === 0) {
      return res.status(404).json({ message: 'Note not found or you do not have permission to update it' });
    }

    const updatedNote = await Note.findByPk(noteId);
    res.json(updatedNote);
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ message: 'Server error updating note' });
  }
});

// Delete a note
router.delete('/notes/:id', authenticateToken, async (req, res) => {
  const noteId = req.params.id;

  try {
    const deletedRows = await Note.destroy({
      where: { id: noteId, userId: req.user.id },
    });

    if (deletedRows === 0) {
      return res.status(404).json({ message: 'Note not found or you do not have permission to delete it' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ message: 'Server error deleting note' });
  }
});

export { router as dataRouter };

