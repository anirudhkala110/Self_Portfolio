const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer')
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Contact = require('./Modal/ContactModal');
const Admin = require('./Modal/AdminModal');
const Updates = require('./Modal/UpdateModal');
const path = require('path')
const fs = require('fs').promises;

const app = express();
app.use(express.json());
app.use(express.static('Public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: ["http://localhost:3016"],
    methods: ["POST", "GET", "PUT", "DELETE"],
    credentials: true,
}));

const port = process.env.PORT || 30000;
const jwtSecret = process.env.JWT_SECRET_KEY;

mongoose.connect(
    `${process.env.DATABASE_URL}`,
    {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }
);

const db = mongoose.connection;

app.get('/', (req, res) => {
    // console.log("Connected");
    return res.json('Connected');
});

// Middleware to check admin authentication
const checkAdminAuth = (req, res, next) => {
    const token = req.cookies.token;
    // console.log(token)
    if (!token) {
        return res.json({ error: 'Unauthorized' });
    }
    else {
        jwt.verify(token, jwtSecret, (err, decodedToken) => {
            if (err) {
                return res.json({ error: 'Unauthorized' });
            } else {
                req.id = decodedToken.id;
                req.name = decodedToken.username;
                req.admin = decodedToken
                next();
            }
        });
    }
};

// Saving Customer Data
app.post('/api/saveData', async (req, res) => {
    const { name, email, query, mobile, date, time, id } = req.body;

    try {
        await Contact.create({
            name: name,
            mobile: mobile,
            email: email,
            query: query,
            date: date,
            time: time,
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error saving form data to MongoDB:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// Admin Register
app.post('/api/register', async (req, res) => {
    const { name, email, password, cpassword } = req.body;

    if (cpassword !== password) {
        return res.json({ msg: "Password didn't match, try again...", msg_type: 'error' });
    }

    if (!cpassword) {
        return res.json({ msg: "Enter valid Confirm Password, try again...", msg_type: 'error' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await Admin.create({
            name: name,
            email: email,
            password: hashedPassword,
        });

        res.status(201).json({ msg: 'Admin registered successfully', msg_type: 'good' });
    } catch (error) {
        console.error('Error registering admin:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Login data
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const admin = await Admin.findOne({ email: email });
        if (!admin) {
            return res.json({ msg: 'Invalid email or password', msg_type: 'error' });
        }

        const isPasswordMatch = await bcrypt.compare(password, admin.password);

        if (isPasswordMatch) {
            const token = jwt.sign({ userId: admin._id, username: admin.name, email: admin.email }, jwtSecret, { expiresIn: '1h' });
            res.cookie('token', token, { httpOnly: true, sameSite: 'none', secure: true });
            return res.json({ msg: 'Login successful', msg_type: 'good', login: true });

        } else {
            res.json({ msg: 'Password Error. . . ', msg_type: 'error' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Logout
app.get('/api/logout', (req, res) => {
    res.clearCookie('token')
    return res.json({ logout: true, msg: 'Logout Successful', msg_type: 'error' });
});

// All updates data
app.get('/api/getAllUpdates', async (req, res) => {
    try {
        const allUpdates = await Updates.find().sort({ uploadDate: -1, time: -1 })
            .exec();;
        if (!allUpdates) {
            return res.status(404).json({ success: false, error: 'Updates not found' });
        }

        return res.json({ success: true, updates: allUpdates });
    } catch (error) {
        console.error('Error retrieving updates from MongoDB:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
app.get('/api/getupdate/:title', async (req, res) => {
    const title = req.params.title;
    try {
        const allUpdates = await Updates.find({ title: title })


        if (!allUpdates) {
            return res.status(404).json({ success: false, error: 'Updates not found' });
        }

        return res.json({ success: true, updates: allUpdates });
    } catch (error) {
        console.error('Error retrieving updates from MongoDB:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});


// Delete a resource by ID
app.delete('/api/resources/:selectedResourceId', checkAdminAuth, async (req, res) => {
    const selectedResourceId = req.params.selectedResourceId;
    console.log(selectedResourceId);

    try {
        const update = await Updates.findById(selectedResourceId);

        if (!update) {
            return res.status(404).json({ error: 'Update not found' });
        }

        // Construct the file path based on your file naming convention
        const filePath = path.join(__dirname, 'Public/File', update.file);

        // Use fs.unlink to delete the file
        await fs.unlink(filePath);

        // Now, delete the database record
        const deletedUpdate = await Updates.deleteOne({ _id: selectedResourceId });

        if (deletedUpdate.deletedCount === 0) {
            return res.status(404).json({ error: 'Update not found in database' });
        }

        res.json({ msg: 'Update and file deleted successfully', msg_type: 'good' });
    } catch (error) {
        console.error('Error deleting update:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// app.delete('/api/resources/:selectedResourceId', checkAdminAuth, async (req, res) => {
//     const selectedResourceId = req.params.selectedResourceId;
//     console.log(selectedResourceId)
//     try {
//         const deletedUpdate = await Updates.deleteOne({ _id: selectedResourceId });

//         if (!deletedUpdate.deletedCount) {
//             return res.status(404).json({ error: 'Update not found' });
//         }

//         res.json({ msg: 'Post deleted successfully', msg_type: 'good' });
//     } catch (error) {
//         console.error('Error deleting update:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });
//

app.get('/api/protectedRoute', checkAdminAuth, (req, res) => {
    res.json({ message: 'Admin is authenticated', adminId: req.admin.userId, name: req.admin.username, login: true });
});

// Updating Data API

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'Public/File')
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + "-_-" + Date.now() + path.extname(file.originalname))
    }
})

const upload = multer({
    storage: storage
})

app.post('/api/saveUpdate/:title/:heading/:desc', checkAdminAuth, upload.single('file'), async (req, res) => {
    const { title, desc, heading } = req.params;
    const file = req.file.filename
    console.log("Call reached. . .")
    console.log(title, desc, heading, file)
    try {
        const descr = JSON.stringify(desc);
        console.log(typeof (descr))
        await Updates.create({
            // title: title, head: heading, desc: descr, vlink: vlink, file: req.file.filename
            title: title, head: heading, desc: descr, file: req.file.filename
        });

        res.status(201).json({ msg: 'Update saved successfully' });
    } catch (error) {
        console.error('Error saving update:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start the server
// app.listen(port, () => {
//     console.log(`Server is running on port ${port}`);
// });

db.on('error', (error) => {
    console.error('MongoDB connection error:', error);
});

db.once('open', () => {
    console.log('Connected to MongoDB');
    // Start your server or perform other operations here
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
});


// MySQL Connection

// const express = require('express');
// const bodyParser = require('body-parser');
// const jwt = require('jsonwebtoken');
// const cookieParser = require('cookie-parser');
// const cors = require('cors');
// const bcrypt = require('bcryptjs');
// const { Sequelize, DataTypes } = require('sequelize');
// const Contact = require('./Modal/ContactModal');
// const Admin = require('./Modal/AdminModal');
// const Updates = require('./Modal/UpdateModal');

// const app = express();
// app.use(express.json());
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(cookieParser());
// app.use(cors({
//     origin: ["https://legalbrother.in", "http://localhost:9719"],
//     methods: ["POST", "GET", "PUT", "DELETE"],
//     credentials: true,
// }));

// const port = process.env.PORT || 3000;
// const jwtSecret = process.env.JWT_SECRET_KEY;
//  const sequelize = new Sequelize({
//      dialect: 'mysql',
//      host: process.env.HOST,
//      username: process.env.USER,
//      password: process.env.PASS,
//      database: process.env.DATABASE,
//  });

// app.get('/', (req, res) => {
//     console.log("Connected");
//     return res.json('Connected');
// });

// // Middleware to check admin authentication
// const checkAdminAuth = (req, res, next) => {
//     const token = req.cookies.token;
//     console.log(token)
//     if (!token) {
//         return res.json({ error: 'Unauthorized' });
//     }
//     else {
//         jwt.verify(token, jwtSecret, (err, decodedToken) => {
//             if (err) {
//                 return res.json({ error: 'Unauthorized' });
//             } else {
//                 console.log(decodedToken)
//                 req.id = decodedToken.id;
//                 req.name = decodedToken.username;
//                 req.admin = decodedToken
//                 next();
//             }
//         });
//     }
// };

// // Saving Customer Data
// app.post('/api/saveData', async (req, res) => {
//     const { name, email, query, mobile, date, time, id } = req.body;

//     try {
//         await Contact.create({
//             name: name,
//             mobile: mobile,
//             email: email,
//             query: query,
//             date: date,
//             time: time,
//         });

//         res.json({ success: true });
//     } catch (error) {
//         console.error('Error saving form data to MySQL:', error);
//         res.status(500).json({ success: false, error: 'Internal Server Error' });
//     }
// });

// // Admin Register
// app.post('/api/register', async (req, res) => {
//     const { name, email, password, cpassword } = req.body;

//     if (cpassword !== password) {
//         return res.json({ msg: "Password didn't match, try again...", msg_type: 'error' });
//     }

//     if (!cpassword) {
//         return res.json({ msg: "Enter valid Confirm Password, try again...", msg_type: 'error' });
//     }

//     try {
//         const hashedPassword = await bcrypt.hash(password, 10);
//         await Admin.create({
//             name: name,
//             email: email,
//             password: hashedPassword,
//         });

//         res.status(201).json({ msg: 'Admin registered successfully', msg_type: 'good' });
//     } catch (error) {
//         console.error('Error registering admin:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// // Login data
// app.post('/api/login', async (req, res) => {
//     const { email, password } = req.body;

//     try {
//         const admin = await Admin.findOne({ where: { email: email } });
//         if (!admin) {
//             return res.json({ msg: 'Invalid email or password', msg_type: 'error' });
//         }

//         const isPasswordMatch = await bcrypt.compare(password, admin.password);

//         if (isPasswordMatch) {
//             const token = jwt.sign({ userId: admin.id, username: admin.name, email: admin.email }, jwtSecret, { expiresIn: '1h' });
//             res.cookie('token', token, { httpOnly: true, sameSite: 'none', secure: true });
//             return res.json({ msg: 'Login successful', msg_type: 'good', login: true });

//         } else {
//             res.json({ msg: 'Password Error. . . ', msg_type: 'error' });
//         }
//     } catch (error) {
//         console.error('Error during login:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// // Logout
// app.get('/api/logout', (req, res) => {
//     res.clearCookie('token')
//     console.log("Called")
//     return res.json({ logout: true, msg: 'Logout Successful', msg_type: 'error' });
// });

// // All updates data
// app.get('/api/getAllUpdates', async (req, res) => {
//     try {
//         // const allUpdates = await Updates.findAll({ order: [['time', 'DESC']] });
//         const allUpdates = await Updates.findAll({ order: [['uploadDateTime', 'DESC']] });
//         if (!allUpdates) {
//             return res.status(404).json({ success: false, error: 'Updates not found' });
//         }

//         return res.json({ success: true, updates: allUpdates });
//     } catch (error) {
//         console.error('Error retrieving updates from MySQL:', error);
//         res.status(500).json({ success: false, error: 'Internal Server Error' });
//     }
// });

// // Delete a resource by ID
// app.delete('/api/resources/:selectedResourceId', checkAdminAuth, async (req, res) => {
//     const selectedResourceId = req.params.selectedResourceId;
//     console.log(selectedResourceId)
//     try {
//         const deletedUpdate = await Updates.destroy({ where: { id: selectedResourceId } });

//         if (!deletedUpdate) {
//             return res.status(404).json({ error: 'Update not found' });
//         }

//         res.json({ msg: 'Post deleted successfully', msg_type: 'good' });
//     } catch (error) {
//         console.error('Error deleting update:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// app.get('/api/protectedRoute', checkAdminAuth, (req, res) => {
//     res.json({ message: 'Admin is authenticated', adminId: req.admin.id, name: req.admin.name, login: true });
// });

// // Updating Data API
// app.post('/api/saveUpdate', checkAdminAuth, async (req, res) => {
//     const { topic, content } = req.body;
//     const date = req.body.date;
//     const time = req.body.time;

//     try {
//         const desc = JSON.stringify(content);
//         console.log(typeof (desc))
//         await Updates.create({
//             topic: topic,
//             desc: desc,
//         });

//         res.status(201).json({ msg: 'Update saved successfully' });
//     } catch (error) {
//         console.error('Error saving update:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });

// // Start the server
// sequelize.sync().then(() => {
//     app.listen(port, () => {
//         console.log(`Server is running on port ${port}`);
//     });
// });
