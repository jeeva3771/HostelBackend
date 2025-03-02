const dotenv = require('dotenv')
const express = require('express')
const mysql = require('mysql2')
const pino = require('pino')
const pinoHttp = require('pino-http')
const path = require('path')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const cors = require('cors')
const MySQLStore = require('express-mysql-session')(session)
const { v4: uuidv4 } = require('uuid')

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

const logger = pino({
    level: 'info'
})

const dbOptions = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}

const sessionStore = new MySQLStore(dbOptions)

function setupApplication(app) {
    app.use(express.static(path.join(__dirname, 'public')))
    app.use(express.json())
    app.use(cookieParser())

    const corsOptions = {
        origin: 'https://hostelfrontend-production.up.railway.app/',  // Allow specific origin 
        methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific methods
        credentials : true
    }
    app.use(cors(corsOptions))

    app.use(session({ 
        store: sessionStore,
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24,  
            secure: false
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
}

// const studentApp = express()
const wardenApp = express()

setupApplication(wardenApp)
// setupApplication(studentApp)

const pageWardenSessionExclude = [
    '/login/',
    '/api/login/',
    '/warden/resetpassword/',
    '/api/warden/generateotp/',
    '/api/warden/resetpassword/'
]

const pageStudentSessionExclude = [
    '/student/login/',
    '/api/student/generateotp/?emailId',
    '/api/student/verifyotp/authentication/'
]

// only works for warden
wardenApp.use((req, res, next) => {
    if (pageWardenSessionExclude.includes(req.originalUrl)) {
        console.log(req.originalUrl, 'exclude' )
        return next()
    }
    
    if (req.originalUrl !== '/login') {
        if (req.session.isLogged !== true) {
            console.log('401')

            return res.status(401).send('Session expired.')
        }
    }
    return next()
})

wardenApp.mysqlClient.connect(function (err) {
    if (err) {
        console.error(err)
    } else {
        console.log('mysql connected')

        course(wardenApp)
        block(wardenApp)
        warden(wardenApp)
        blockFloor(wardenApp)
        room(wardenApp)
        student(wardenApp)
        attendance(wardenApp)
        home(wardenApp)


        wardenApp.listen(process.env.APP_PORT, () => {
            logger.info(`listen ${process.env.APP_PORT} port`)
        })
    }
})

// only works for student

// studentApp.use((req, res, next) => {
//     if (pageStudentSessionExclude.includes(req.originalUrl)) {
//         return next()
//     }
//     if (req.originalUrl !== '/student/login/') {
//         if (req.session.isLoggedStudent !== true) {
//             return res.status(401).send('Session expired.')
//         }
//     }
//     return next()
// })

// studentApp.mysqlClient.connect(function (err) {
//     if (err) {
//         console.error(err)
//     } else {
//         console.log('mysql connected')
//         studentUse(studentApp)
//         studentApp.listen(process.env.STUDENT_APP_PORT, () => {
//             logger.info(`listen ${process.env.STUDENT_APP_PORT} port`)
//         })
//     }
// })


// STUDENT_APP_URL=https://hostelbackend-production-7cfd.up.railway.app
// STUDENT_APP_PORT=80




//////////////////////////


const dotenv = require('dotenv')
const express = require('express')
const mysql = require('mysql2')
const pino = require('pino')
const pinoHttp = require('pino-http')
const path = require('path')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const cors = require('cors')
const MySQLStore = require('express-mysql-session')(session)
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

const logger = pino({
    level: 'info'
})

const dbOptions = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}

const sessionStore = new MySQLStore(dbOptions)

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
    store: sessionStore,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        secure: false,
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



///////////////////////1111111111111111111





// const dotenv = require('dotenv')
// const express = require('express')
// const mysql = require('mysql2')
// const pino = require('pino')
// const pinoHttp = require('pino-http')
// const path = require('path')
// const cookieParser = require('cookie-parser')
// const session = require('express-session')
// const cors = require('cors')
// const MySQLStore = require('express-mysql-session')(session)
// const { v4: uuidv4 } = require('uuid')

// dotenv.config({ path: `env/${process.env.NODE_ENV}.env` })

// //apicontroller
// const course = require('./apicontroller/course.js')
// const block = require('./apicontroller/block.js')
// const warden = require('./apicontroller/warden.js')
// const blockFloor = require('./apicontroller/blockfloor.js')
// const room = require('./apicontroller/room.js')
// const student = require('./apicontroller/student.js')
// const attendance = require('./apicontroller/attendance.js')
// const studentUse = require('./apicontroller/studentuse.js')
// const home = require('./apicontroller/home.js')

// const logger = pino({
//     level: 'info'
// })

// const dbOptions = {
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME
// }

// const sessionStore = new MySQLStore(dbOptions)

// function setupApplication(app) {
//     app.use(express.static(path.join(__dirname, 'public')))
//     app.use(express.json())
//     app.use(cookieParser())

//     const corsOptions = {
//         origin: 'http://localhost:3000',
//         methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific methods
//         credentials : true
//     }
//     app.use(cors(corsOptions))

//     app.use(session({ 
//         store: sessionStore,
//         secret: process.env.SESSION_SECRET,
//         resave: false,
//         saveUninitialized: false,
//         cookie: {
//             maxAge: 1000 * 60 * 60 * 24,  
//             secure: false
//         }
//     }))

//     app.use(
//         pinoHttp({
//             logger,
//             customLogLevel: (res, err) => (res.statusCode >= 500 ? 'error' : 'info'),
//             customSuccessMessage: (req, res) => `Request to ${req.url} processed`,
//             genReqId: (req) => {
//                 req.startTime = Date.now();
//                 return req.id || uuidv4();
//             },
//             customAttributeKeys: {
//                 reqId: 'requestId',
//             },
//         })
//     )
    
//     // Middleware to log the total process time
//     app.use((req, res, next) => {
//         res.on('finish', () => {
//             const processTime = Date.now() - req.startTime
//             req.log.info({ processTime }, `Request processed in ${processTime}ms`)
//         })
//         next()
//     })
    
//     app.set('view engine', 'ejs')
//     app.set('views', path.join(__dirname, '/uicontroller/views'))

//     app.mysqlClient = mysql.createConnection(dbOptions)    
// }

// // const studentApp = express()
// const wardenApp = express()

// setupApplication(wardenApp)
// // setupApplication(studentApp)

// const pageWardenSessionExclude = [
//     '/login/',
//     '/api/login/',
//     '/warden/resetpassword/',
//     '/api/warden/generateotp/',
//     '/api/warden/resetpassword/'
// ]

// const pageStudentSessionExclude = [
//     '/student/login/',
//     '/api/student/generateotp/?emailId',
//     '/api/student/verifyotp/authentication/'
// ]

// // only works for warden
// wardenApp.use((req, res, next) => {
//     if (pageWardenSessionExclude.includes(req.originalUrl)) {
//         return next()
//     }
    
//     if (req.originalUrl !== '/login') {
//         if (req.session.isLogged !== true) {
//             return res.status(401).send('Session expired.')
//         }
//     }
//     return next()
// })

// wardenApp.mysqlClient.connect(function (err) {
//     if (err) {
//         console.error(err)
//     } else {
//         console.log('mysql connected')

//         course(wardenApp)
//         block(wardenApp)
//         warden(wardenApp)
//         blockFloor(wardenApp)
//         room(wardenApp)
//         student(wardenApp)
//         attendance(wardenApp)
//         home(wardenApp)


//         wardenApp.listen(process.env.APP_PORT, () => {
//             logger.info(`listen ${process.env.APP_PORT} port`)
//         })
//     }
// })

// // only works for student

// // studentApp.use((req, res, next) => {
// //     if (pageStudentSessionExclude.includes(req.originalUrl)) {
// //         return next()
// //     }
// //     if (req.originalUrl !== '/student/login/') {
// //         if (req.session.isLoggedStudent !== true) {
// //             return res.status(401).send('Session expired.')
// //         }
// //     }
// //     return next()
// // })

// // studentApp.mysqlClient.connect(function (err) {
// //     if (err) {
// //         console.error(err)
// //     } else {
// //         console.log('mysql connected')
// //         studentUse(studentApp)
// //         studentApp.listen(process.env.STUDENT_APP_PORT, () => {
// //             logger.info(`listen ${process.env.STUDENT_APP_PORT} port`)
// //         })
// //     }
// // })


// // STUDENT_APP_URL=https://hostelbackend-production-7cfd.up.railway.app
// // STUDENT_APP_PORT=80







const dotenv = require('dotenv');
const express = require('express');
const mysql = require('mysql');
const pino = require('pino');
const pinoHttp = require('pino-http');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const FileStoreWarden = require('session-file-store')(session);
const cors = require('cors');

// const FileStoreStudent = require('session-file-store')(session);

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

function setupApplication(app) {
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.json())
    app.use(cookieParser());

    const corsOptions = {
        origin: 'http://localhost:3000', // Allow specific origin
        methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific methods
        credentials : true
    }
    app.use(cors(corsOptions));

    app.use(session({ 
        store: new FileStoreWarden({}),
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 *60 * 24,
            // marAge: 1000 * 60,
            secure: false
        }
    }));

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
    
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '/uicontroller/views'));

    app.mysqlClient = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    })    
}

// const studentApp = express()
const wardenApp = express()

setupApplication(wardenApp)
// setupApplication(studentApp)

const pageWardenSessionExclude = [
    '/login/',
    '/api/login/',
    '/warden/resetpassword/',
    '/api/warden/generateotp/',
    '/api/warden/resetpassword/'
]

const pageStudentSessionExclude = [
    '/student/login/',
    '/api/student/generateotp/',
    '/api/student/verifyotp/authentication/'
]

// only works for warden
wardenApp.use((req, res, next) => {
    if (pageWardenSessionExclude.includes(req.originalUrl)) {
        return next()
    }
    
    if (req.originalUrl !== '/login') {
        if (req.session.isLogged !== true) {
            return res.status(401).redirect(getAppUrl('login'))
        }
    }
    return next()
})

wardenApp.mysqlClient.connect(function (err) {
    if (err) {
        console.error(err)
    } else {
        console.log('mysql connected')

        course(wardenApp)
        block(wardenApp)
        warden(wardenApp)
        blockFloor(wardenApp)
        room(wardenApp)
        student(wardenApp)
        attendance(wardenApp)
        studentUse(wardenApp)
        home(wardenApp)


        wardenApp.listen(process.env.APP_PORT, () => {
            logger.info(`listen ${process.env.APP_PORT} port`)
        })
    }
})

// // only works for student
// studentApp.use((req, res, next) => {
//     if (pageStudentSessionExclude.includes(req.originalUrl)) {
//         return next()
//     }
//     console.log(req.session.isLoggedStudent)
//     if (req.originalUrl !== '/student/login/') {
//         if (req.session.isLoggedStudent !== true) {
//             return res.status(401).send('Session expired.')
//         }
//     }
//     return next()
// })

// studentApp.mysqlClient.connect(function (err) {
//     if (err) {
//         console.error(err)
//     } else {
//         console.log('mysql connected')
//         studentUse(studentApp)
//         studentUseUi(studentApp)
//         studentApp.listen(process.env.STUDENT_APP_PORT, () => {
//             logger.info(`listen ${process.env.STUDENT_APP_PORT} port`)
//         })
//     }
// })

//////////////////////////////////////////////////




// const dotenv = require('dotenv')
// const express = require('express')
// const mysql = require('mysql2')
// const pino = require('pino')
// const pinoHttp = require('pino-http')
// const path = require('path')
// const cookieParser = require('cookie-parser')
// const session = require('express-session')
// const cors = require('cors')
// const MySQLStore = require('express-mysql-session')(session)
// const { v4: uuidv4 } = require('uuid')
// const app = express()

// dotenv.config({ path: `env/${process.env.NODE_ENV}.env` })

// //apicontroller
// const course = require('./apicontroller/course.js')
// const block = require('./apicontroller/block.js')
// const warden = require('./apicontroller/warden.js')
// const blockFloor = require('./apicontroller/blockfloor.js')
// const room = require('./apicontroller/room.js')
// const student = require('./apicontroller/student.js')
// const attendance = require('./apicontroller/attendance.js')
// const studentUse = require('./apicontroller/studentuse.js')
// const home = require('./apicontroller/home.js')

// const logger = pino({
//     level: 'info'
// })

// const dbOptions = {
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME
// }

// const sessionStore = new MySQLStore(dbOptions)

// app.use(express.static(path.join(__dirname, 'public')))
// app.use(express.json())
// app.use(cookieParser())
  
// const corsOptions = {
//     origin: 'https://yellowgreen-crow-110465.hostingersite.com',
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     credentials : true,
// }
// app.use(cors(corsOptions))

// app.use(session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: sessionStore,
//     cookie: {
//         maxAge: 1000 * 60 * 60 * 24,
//         secure: false,
//         httpOnly: true
//     }
// }))

// // app.use((req, res, next) => {
// //     res.on('finish', () => {
// //         console.log('Set-Cookie Header:', res.getHeaders()['set-cookie']);
// //     });
// //     next();
// // });

// // app.use((req, res, next) => {
// //     res.cookie('testCookie', 'value', { httpOnly: true });
// //     next();
// // });

// app.use(
//     pinoHttp({
//         logger,
//         customLogLevel: (res, err) => (res.statusCode >= 500 ? 'error' : 'info'),
//         customSuccessMessage: (req, res) => `Request to ${req.url} processed`,
//         genReqId: (req) => {
//             req.startTime = Date.now();
//             return req.id || uuidv4();
//         },
//         customAttributeKeys: {
//             reqId: 'requestId',
//         },
//     })
// )


// // Middleware to log the total process time
// app.use((req, res, next) => {
//     res.on('finish', () => {
//         const processTime = Date.now() - req.startTime
//         req.log.info({ processTime }, `Request processed in ${processTime}ms`)
//     })
//     next()
// })

// app.set('view engine', 'ejs')
// app.set('views', path.join(__dirname, '/uicontroller/views'))

// app.mysqlClient = mysql.createConnection(dbOptions)    

// const pageWardenSessionExclude = [
//     '/login/',
//     '/api/login/',
//     '/warden/resetpassword/',
//     '/api/warden/generateotp/',
//     '/api/warden/resetpassword/'
// ]

// const pageStudentSessionExclude = [
//     '/student/login/',
//     '/student/api/student/generateotp/',
//     '/student/api/student/verifyotp/authentication/'
// ]

// const studentUrls = [
//     '/student/api/student/name',
//     '/student/api/student/image',
//     '/student/api/student/deleteimage',
//     '/student/api/student/attendancereport',
//     '/student/api/student/logout',
//     '/student/api/student/editimage'
// ]

// app.use((req, res, next) => {
//     if (pageWardenSessionExclude.includes(req.originalUrl)) {
//         return next()
//     }

//     if (req.originalUrl !== '/login') {
//         if (req.session.isLogged !== true) {
//             return res.status(401).send('Session expired.')
//         }
//     }
//     return next()
// })

// app.use((req, res, next) => {
//     if (pageStudentSessionExclude.includes(req.originalUrl)) {
//         return next()
//     }

//     if (req.originalUrl !== '/student/login') {
//         if (studentUrls.includes(req.originalUrl) && req.session.isLoggedStudent !== true) {
//             return res.status(401).send('Session expired.');
//         }
//     }
    
//     return next()
// })

// app.mysqlClient.connect(function (err) {
//     if (err) {
//         console.error(err)
//     } else {
//         console.log('mysql connected')

//         course(app)
//         block(app)
//         warden(app)
//         blockFloor(app)
//         room(app)
//         student(app)
//         attendance(app)
//         home(app)
//         studentUse(app)

//         app.listen(process.env.APP_PORT, () => {
//             logger.info(`listen ${process.env.APP_PORT} port`)
//         })
//     }
// })  