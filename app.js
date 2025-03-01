const dotenv = require('dotenv')
const express = require('express')
const mysql = require('mysql2')
const pino = require('pino')
const pinoHttp = require('pino-http')
const path = require('path')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const RedisStore = require('connect-redis').default
const { createClient } = require('redis')

const cors = require('cors')
// const MySQLStore = require('express-mysql-session')(session)
const { v4: uuidv4 } = require('uuid')
const app = express()

dotenv.config({ path: `env/${process.env.NODE_ENV}.env` })

//apicontroller
const course = require('./apicontroller/course.js')
const block = require('./apicontroller/block.js')
const warden = require('./apicontroller/warden.js')
const blockFloor = require('./apicontroller/blockfloor.js')
const room = require('./apicontroller/room.js')
const student = require('./apicontroller/student.js')
const attendance = require('./apicontroller/attendance.js')
const studentUse = require('./apicontroller/studentuse.js')
const home = require('./apicontroller/home.js')

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://default:yourpassword@yourredisurl:6379'
});

redisClient.connect().catch(console.error);


const logger = pino({
    level: 'info'
})

const dbOptions = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}

// const sessionStore = new MySQLStore(dbOptions)

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())
app.use(cookieParser())
  
const corsOptions = {
    origin: 'https://yellowgreen-crow-110465.hostingersite.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials : true
}
app.use(cors(corsOptions))

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new RedisStore({ client: redisClient }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        secure: true,
        httpOnly: true
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
)


// Middleware to log the total process time
app.use((req, res, next) => {
    res.on('finish', () => {
        const processTime = Date.now() - req.startTime
        req.log.info({ processTime }, `Request processed in ${processTime}ms`)
    })
    next()
})

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '/uicontroller/views'))

app.mysqlClient = mysql.createConnection(dbOptions)    

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
        console.log(req.session)

        if (req.session.isLogged !== true) {
            
            console.log('Session ID:', req.sessionID);
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
            return res.status(401).send('Session expired.');
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
        home(app)
        studentUse(app)

        app.listen(process.env.APP_PORT, () => {
            logger.info(`listen ${process.env.APP_PORT} port`)
        })
    }
})