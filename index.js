// require('dotenv').config();
// const express = require("express");
// const session = require("express-session");
// const mongoose = require("mongoose");
// const path = require("path");
// const User = require("./models/User");

// const app = express();
// const PORT = process.env.PORT || 3000;

// // MongoDB Connection
// async function connectDB() {
//     try {
//         await mongoose.connect(process.env.ATLASDB_URL, {
//             useNewUrlParser: true,
//             useUnifiedTopology: true
//         });
//         console.log("Connected to MongoDB Atlas");
//     } catch (err) {
//         console.error("DB connection error:", err);
//     }
// }
// connectDB();

// // Middleware
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(express.static("public"));

// app.use(session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false
// }));

// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "/views"));

// // Utility to handle async errors
// function asyncHandler(fn) {
//     return (req, res, next) => {
//         Promise.resolve(fn(req, res, next)).catch(next);
//     };
// }

// // Middleware
// function requireLogin(req, res, next) {
//     if (!req.session.userId) {
//         return res.redirect('/signin');
//     }
//     next();
// }

// function requireAdmin(req, res, next) {
//     if (!req.session.isAdmin) {
//         return res.status(403).send("Access Denied: Admins Only");
//     }
//     next();
// }

// // Routes
// app.get("/", (req, res) => {
//     res.render("index");
// });

// app.get("/signin", (req, res) => {
//     res.render("signin", { error: null });
// });

// app.get("/signup", (req, res) => {
//     res.render("signup", { error: null });
// });

// app.post("/signup", asyncHandler(async (req, res) => {
//     const { email, username, password } = req.body;

//     if (!email || !username || !password) {
//         return res.render("signup", { error: "All fields are required!" });
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//         return res.render("signup", { error: "Email already exists!" });
//     }

//     const newUser = new User({
//         email,
//         username,
//         password,
//         isAdmin: false
//     });

//     await newUser.save();
//     res.redirect("/signin");
// }));

// app.post("/signin", asyncHandler(async (req, res) => {
//     const { email, password } = req.body;

//     if (!email || !password) {
//         return res.render("signin", { error: "Both email and password are required!" });
//     }

//     const user = await User.findOne({ email, password });

//     if (user) {
//         req.session.userId = user._id;
//         req.session.isAdmin = user.isAdmin;
//         res.redirect("/home");
//     } else {
//         res.render("signin", { error: "Invalid email or password" });
//     }
// }));

// app.get("/home", requireLogin, asyncHandler(async (req, res) => {
//     const user = await User.findById(req.session.userId).lean();
//     res.render("mainpage", { user });
// }));

// app.get("/profile/edit", requireLogin, asyncHandler(async (req, res) => {
//     const user = await User.findById(req.session.userId).lean();
//     res.render("editprofile", { user });
// }));

// app.post("/profile/edit", requireLogin, asyncHandler(async (req, res) => {
//     const { username, password } = req.body;
//     await User.findByIdAndUpdate(req.session.userId, { username, password });
//     res.redirect("/home");
// }));

// app.get("/admin/users", requireLogin, requireAdmin, asyncHandler(async (req, res) => {
//     const users = await User.find().lean();
//     res.render("adminusers", { users });
// }));

// app.post("/admin/users/:id/delete", requireLogin, requireAdmin, asyncHandler(async (req, res) => {
//     await User.findByIdAndDelete(req.params.id);
//     res.redirect("/admin/users");
// }));

// app.get("/logout", (req, res) => {
//     req.session.destroy(err => {
//         if (err) {
//             console.error("Logout error:", err);
//             return res.status(500).send("Error logging out");
//         }
//         res.redirect("/signin");
//     });
// });

// // Global Error Handler
// app.use((err, req, res, next) => {
//     console.error('Global Error Handler:', err);
//     const status = err.status || 500;

//     if (req.accepts('html')) {
//         return res.status(status).render('error', {
//             message: err.message || 'Internal Server Error',
//             status
//         });
//     }
//     if (req.accepts('json')) {
//         return res.status(status).json({ error: err.message || 'Internal Server Error' });
//     }
//     res.status(status).type('txt').send(err.message || 'Internal Server Error');
// });

// // Start Server
// app.listen(PORT, () => {
//     console.log(`Server running on http://localhost:${PORT}`);
// });
require('dotenv').config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const bcrypt = require("bcrypt");
const multer = require("multer");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const User = require("./models/User");
const ToDo = require("./models/ToDo");

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB connection
async function connectDB() {
  try {
    await mongoose.connect(process.env.ATLASDB_URL);
    console.log("Connected to MongoDB Atlas");
  } catch (err) {
    console.error("DB connection error:", err);
  }
}
connectDB();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer-storage-cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "user_profiles",
    allowed_formats: ["jpg", "jpeg", "png", "gif"],
    public_id: (req, file) => `user_${req.session.userId}_${Date.now()}`,
  },
});
const upload = multer({ storage });

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: true, httpOnly: true } // enable in production with HTTPS
}));

app.use(express.static("public"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

// Async error handler wrapper
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function requireLogin(req, res, next) {
  if (!req.session.userId) return res.redirect('/signin');
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) return res.status(403).send("Admins only");
  next();
}

// ROUTES

app.get("/", (req, res) => res.render("index"));

app.get("/signup", (req, res) => res.render("signup", { error: null }));
app.get("/signin", (req, res) => res.render("signin", { error: null }));

app.post("/signup", asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  if (!email || !username || !password) return res.render("signup", { error: "All fields required" });

  if (await User.findOne({ email })) return res.render("signup", { error: "Email exists" });
  if (await User.findOne({ username })) return res.render("signup", { error: "Username exists" });

  const hashed = await bcrypt.hash(password, 10);
  await new User({ email, username, password: hashed, isAdmin: false }).save();
  return res.redirect("/signin");
}));

app.post("/signin", asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.render("signin", { error: "Both fields required" });

  const user = await User.findOne({ email });
  if (!user) return res.render("signin", { error: "Invalid credentials" });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.render("signin", { error: "Invalid credentials" });

  req.session.userId = user._id.toString();
  req.session.isAdmin = user.isAdmin;
  return res.redirect("/home");
}));

app.get("/home", requireLogin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.session.userId).lean();
  const todos = await ToDo.find({ userId: req.session.userId }).lean();
  return res.render("mainpage", { user, todos });
}));

app.get("/profile/edit", requireLogin, asyncHandler(async (req, res) => {
  const user = await User.findById(req.session.userId).lean();
  return res.render("editprofile", { user, error: null });
}));

// Update profile with Cloudinary photo upload
app.post("/profile/edit", requireLogin, (req, res, next) => {
  upload.single('profilePhoto')(req, res, async (err) => {
    if (err) return next(err);

    try {
      const { username, email, currentPassword, newPassword } = req.body;
      const user = await User.findById(req.session.userId);

      // Validate current password
      const validPass = await bcrypt.compare(currentPassword, user.password);
      if (!validPass) {
        return res.render("editprofile", { user: user.toObject(), error: "Current password incorrect" });
      }

      // Update username/email if changed and unique (exclude current user)
      if (username && username !== user.username) {
        const exists = await User.findOne({ username, _id: { $ne: user._id } });
        if (exists) {
          return res.render("editprofile", { user: user.toObject(), error: "Username already taken" });
        }
        user.username = username;
      }
      if (email && email !== user.email) {
        const exists = await User.findOne({ email, _id: { $ne: user._id } });
        if (exists) {
          return res.render("editprofile", { user: user.toObject(), error: "Email already in use" });
        }
        user.email = email;
      }

      // Update password if provided
      if (newPassword && newPassword.trim() !== "") {
        user.password = await bcrypt.hash(newPassword, 10);
      }

      // Save Cloudinary URL if new photo uploaded
      if (req.file) {
        user.profilePhoto = req.file.path; // this is the Cloudinary URL
      }

      await user.save();
      return res.redirect("/home");
    } catch (error) {
      next(error);
    }
  });
});

// ToDo routes

app.post("/todo/add", requireLogin, asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).send("Task title required");

  await new ToDo({ userId: req.session.userId, title, description }).save();
  return res.redirect("/home");
}));

app.post("/todo/:id/toggle", requireLogin, asyncHandler(async (req, res) => {
  const todo = await ToDo.findOne({ _id: req.params.id, userId: req.session.userId });
  if (!todo) return res.status(404).send("Task not found");

  todo.status = todo.status === "pending" ? "done" : "pending";
  await todo.save();
  return res.redirect("/home");
}));

app.post("/todo/:id/delete", requireLogin, asyncHandler(async (req, res) => {
  await ToDo.deleteOne({ _id: req.params.id, userId: req.session.userId });
  return res.redirect("/home");
}));

// Password vault routes

app.post("/passwords/add", requireLogin, asyncHandler(async (req, res) => {
  const { title, password } = req.body;
  if (!title || !password) return res.status(400).send("Title and password required");

  await User.findByIdAndUpdate(req.session.userId, {
    $push: { savedPasswords: { title, password } }
  });
  return res.redirect("/home");
}));

app.post("/passwords/:id/delete", requireLogin, asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.session.userId, {
    $pull: { savedPasswords: { _id: req.params.id } }
  });
  return res.redirect("/home");
}));

// Password reset routes

app.get("/forgot-password", (req, res) => {
  return res.render("forgot-password", { error: null, message: null });
});

app.post("/forgot-password", asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.render("forgot-password", { error: "No user with that email", message: null });

  user.resetPasswordToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    }
  });

  const resetLink = `http://${req.headers.host}/reset-password/${user.resetPasswordToken}`;

  const mailOptions = {
    to: user.email,
    from: process.env.EMAIL_USER,
    subject: "Password Reset",
    text: `Click here to reset your password:\n\n${resetLink}\n\nIf you didn't request this, ignore this email.`,
  };

  await transporter.sendMail(mailOptions);
  return res.render("forgot-password", { error: null, message: "Password reset email sent" });
}));

app.get("/reset-password/:token", asyncHandler(async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) return res.send("Password reset token invalid or expired");

  return res.render("reset-password", { token: req.params.token, error: null });
}));

app.post("/reset-password/:token", asyncHandler(async (req, res) => {
  const { password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    return res.render("reset-password", { token: req.params.token, error: "Passwords do not match" });
  }

  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) return res.send("Password reset token invalid or expired");

  user.password = await bcrypt.hash(password, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();
  return res.redirect("/signin");
}));

// Admin routes

app.get("/admin/users", requireLogin, requireAdmin, asyncHandler(async (req, res) => {
  const users = await User.find().lean();
  return res.render("adminusers", { users });
}));

app.post("/admin/users/:id/delete", requireLogin, requireAdmin, asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  await ToDo.deleteMany({ userId: req.params.id });
  return res.redirect("/admin/users");
}));

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).send("Error logging out");
    }
    return res.redirect("/signin");
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global Error:', err);
  const status = err.status || 500;
  if (req.accepts('html')) {
    return res.status(status).render('error', {
      message: err.message || 'Internal Server Error',
      status
    });
  }
  if (req.accepts('json')) {
    return res.status(status).json({ error: err.message || 'Internal Server Error' });
  }
  return res.status(status).type('txt').send(err.message || 'Internal Server Error');
});



app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

