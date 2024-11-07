const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());




mongoose.connect(`mongodb+srv://elankumaran2103:Elan2005@cluster0.ox2vh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.log(err));

  const userSchema = new mongoose.Schema({
    username: {
      type: String,
      required: true,
      unique: true, 
    },
    email: {
      type: String,
      required: true,
      unique: true, 
      lowercase: true,
    },
    uid: {
      type: String,
      required: true,
      unique: true, 
    },

  }, { timestamps: true });
  
  const User = mongoose.model('User', userSchema);


const RecipeSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  totalTime: {
    type: Number,
    required: true
  },
  calories: {
    type: Number,
    required: true
  },
  ingredients: {
    type: [String],
    required: true
  },
  procedure: {
    type: String,
    required: true
  }
});

const Recipe= mongoose.model('Recipe', RecipeSchema);

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const Admin = mongoose.model('Admin', adminSchema);

const wishlistSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  recipes: [{ type: Number, ref: 'Recipe' }]
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

app.delete('/recipes/:id', async (req, res) => {
  await Recipe.findByIdAndDelete(req.params.id);
  res.json({ message: 'Recipe deleted successfully!' });
});

app.get('/wishlist/:userId', async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ userId: req.params.userId });
    res.json(wishlist ? wishlist.recipes : []);
  } catch (error) {
    res.status(500).send('Error fetching wishlist');
  }
});

app.post('/wishlist/add', async (req, res) => {
  const { userId, recipeId } = req.body;
  console.log(recipeId);
  try {
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({ userId, recipes: [] });
    }
    if (!wishlist.recipes.includes(recipeId)) {
      wishlist.recipes.push(recipeId);
      await wishlist.save();
    }
    console.log(3);
    res.status(200).send('Recipe added to wishlist');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error adding to wishlist');
  }
});

app.post('/wishlist/remove', async (req, res) => {
  const { userId, recipeId } = req.body;
  try {
    const wishlist = await Wishlist.findOne({ userId });
    if (wishlist) {
      wishlist.recipes = wishlist.recipes.filter(id => id!== recipeId);
      await wishlist.save();
    }
    res.status(200).send('Recipe removed from wishlist');
  } catch (error) {
    res.status(500).send('Error removing from wishlist');
  }
});

app.get('/recipes', async (req, res) => {
  try {
    const { label, ingredients, timeLimit } = req.query;

    let filter = {};

    if (label) {
      filter.label = { $regex: label, $options: 'i' }; 
    }

    if (ingredients) {
      const ingredientList = ingredients.split(',').map(ing => ing.trim());
      filter.ingredients = { $all: ingredientList }; 
    }

    if (timeLimit) {
      filter.totalTime = { $lte: parseInt(timeLimit, 10) };
    }

    const recipes = await Recipe.find(filter);

    res.json(recipes);
  } catch (err) {
    console.error('Error fetching recipes:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/recipes', async (req, res) => {
  const { label, image, totalTime, calories, ingredients,procedure } = req.body;

  try {
    const newRecipe = new Recipe({
      label,
      image,
      totalTime,
      calories,
      ingredients,
      procedure,
    });

    await newRecipe.save();

    res.status(201).json({ message: 'Recipe saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
app.post('/admin/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
    
    res.json({ message: 'Login successful', admin: { id: admin._id, email: admin.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/admin/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newAdmin = new Admin({ email,password: hashedPassword });

    await newAdmin.save();

    res.status(201).json({ message: 'Admin created successfully', admin: { email: newAdmin.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


app.post('/api/login', async (req, res) => {
  const { identifier} = req.body;

  try {
   
    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });

    if (!user) {
      return res.status(400).json({ message: 'User not found. Please check your username or email.' });
    }


    res.status(200).json({
      message: 'Login successful',
      user: {
        username: user.username,
        email: user.email,
        uid: user.uid, 
      },
    });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Error logging in. Please try again later.' });
  }
});

app.post('/api/signup', async (req, res) => {
  const { username, email, uid } = req.body;

  try {
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already exists' });

    const newUser = new User({ username, email, uid }); 
    await newUser.save();

    res.status(201).json({ message: 'User created successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating user' });
  }
});
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));