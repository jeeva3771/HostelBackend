const dotenv = require('dotenv');
const express = require('express');
const app = express();
const mysql = require('mysql');
const pino = require('pino');
const pinoHttp = require('pino-http');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

dotenv.config({ path: `env/${process.env.NODE_ENV}.env` });

//apicontroller
const course = require('./apicontroller/course.js');
const block = require('./apicontroller/block.js');
const warden = require('./apicontroller/warden.js');
const blockFloor = require('./apicontroller/blockfloor.js');
const room = require('./apicontroller/room.js');
const student = require('./apicontroller/student.js');
const attendance = require('./apicontroller/attendance.js');
const studentUse = require('./apicontroller/studentuse.js');
const home = require('./apicontroller/home.js');

const logger = pino({
    level: 'info'
});

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json())
app.use(cookieParser());

const corsOptions = {
    origin: 'https://yellowgreen-crow-110465.hostingersite.com',
    // origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific methods
    credentials : true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie']
}
app.use(cors(corsOptions));

app.use(session({ 
    store: new FileStore({}),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 *60 * 24,
        secure: true,  // Set to false if not using HTTPS
        httpOnly: true,
        sameSite: "none"
    }
}))

app.use(
    pinoHttp({
        logger,
        customLogLevel: (res, err) => (res.statusCode >= 500 ? 'error' : 'info'),
        customSuccessMessage: (req, res) => `Request to ${req.url} processed`,
        genReqId: (req) => {
            req.startTime = Date.now();
            return req.id || uuidv4();
        },
        customAttributeKeys: {
            reqId: 'requestId',
        },
    })
);

// Middleware to log the total process time
app.use((req, res, next) => {
    res.on('finish', () => {
        const processTime = Date.now() - req.startTime;
        req.log.info({ processTime }, `Request processed in ${processTime}ms`);
    });
    next();
});

app.mysqlClient = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})    

const pageWardenSessionExclude = [
    '/login/',
    '/api/login/',
    '/warden/resetpassword/',
    '/api/warden/generateotp/',
    '/api/warden/resetpassword/'
]

const pageStudentSessionExclude = [
    '/student/login/',
    '/student/api/student/generateotp/',
    '/student/api/student/verifyotp/authentication/'
]

const studentUrls = [
    '/student/api/student/name',
    '/student/api/student/image',
    '/student/api/student/deleteimage',
    '/student/api/student/attendancereport',
    '/student/api/student/logout',
    '/student/api/student/editimage'
]

app.use((req, res, next) => {
    if (pageWardenSessionExclude.includes(req.originalUrl)) {
        return next()
    }
    
    if (req.originalUrl !== '/login') {
        if (req.session.isLogged !== true && (!pageStudentSessionExclude.includes(req.originalUrl))) {
            return res.status(401).send('Session expired.')
        }
    }
    return next()
})

app.use((req, res, next) => {
    if (pageStudentSessionExclude.includes(req.originalUrl)) {
        return next()
    }

    if (req.originalUrl !== '/student/login') {
        if (studentUrls.includes(req.originalUrl) && req.session.isLoggedStudent !== true) {
            return res.status(401).send('Session expired.')
        }
    }
    return next()
})

app.mysqlClient.connect(function (err) {
    if (err) {
        console.error(err)
    } else {
        console.log('mysql connected')

        course(app)
        block(app)
        warden(app)
        blockFloor(app)
        room(app)
        student(app)
        attendance(app)
        studentUse(app)
        home(app)


        app.listen(process.env.APP_PORT, () => {
            logger.info(`listen ${process.env.APP_PORT} port`)
        })
    }
})
