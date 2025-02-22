const { mysqlQuery, deleteFile, studentDetailsData } = require('../utilityclient/query');
const sendEmail = require('../utilityclient/email');
const otpGenerator = require('otp-generator');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '..', 'studentuploads'))
    },
    filename: function (req, file, cb) {
        const studentId = req.session.studentInfo.studentId;
        cb(null, `${studentId}.jpg`);
    }
})

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg') {
        cb(null, true);
    } else {
        req.fileValidationError = 'Invalid file type. Only JPEG files are allowed.';
        cb(null, false);
    }
};

const upload = multer({ storage, fileFilter })
const multerMiddleware = upload.single('studentImage');

const OTP_LIMIT_NUMBER = 6;
const OTP_OPTION = {
    digits: true,
    upperCaseAlphabets: true,
    lowerCaseAlphabets: false,
    specialChars: false
}

async function generateOtp(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const currentTime = new Date().getTime();
    const {
        emailId
    } = req.body

    try {
        const studentResult = await mysqlQuery(/*sql*/`SELECT otpTiming FROM student 
            WHERE emailId = ? 
            AND deletedAt IS NULL`, [emailId], mysqlClient)

        if (studentResult.length === 0) {
            return res.status(404).send('Invalid Email.')
        }

        const studentOtpTiming = studentResult[0].otpTiming
        const blockedTime = new Date(studentOtpTiming).getTime()

        if (currentTime < blockedTime) {
            return res.status(401).send('Student is blocked for a few hours')
        }

        var otp = otpGenerator.generate(OTP_LIMIT_NUMBER, OTP_OPTION);

        const sendOtp = await mysqlQuery(/*sql*/`UPDATE student SET otp = ? WHERE emailId = ?
        AND deletedAt IS NULL`,
            [otp, emailId],
            mysqlClient
        )

        if (sendOtp.affectedRows === 0) {
            return res.status(404).send('Enable to send OTP.')
        }

        const mailOptions = {
            to: emailId,
            subject: 'One-Time Password',
            html: `Your one-time password (OTP) is <b>${otp}</b>. Please use this code to verify your identity.`
        }
        
        await sendEmail(mailOptions)

        req.session.student = emailId
        return res.status(200).send('success')
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function verifyOtpStudentAuthentication(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const emailId = req.session.student;
    const { otp = null } = req.body;
    const currentTime = new Date().getTime();
    const otpAttemptMax = 3;

    try {
        const [studentDetails] = await mysqlQuery(/*sql*/`
            SELECT
                studentId,
                name,
                registerNumber, 
                otp,
                otpAttempt,
                otpTiming
            FROM student 
            WHERE emailId = ? AND deletedAt IS NULL`,
            [emailId], mysqlClient);

        if (!studentDetails) {
            return res.status(404).send('Oops! Something went wrong. Please contact warden or admin.')
        }
        let studentId = studentDetails.studentId;
        let studentName = studentDetails.name;
        let studentRegNo = studentDetails.registerNumber;
        const studentOtp = studentDetails.otp;
        const studentOtpAttempt = studentDetails.otpAttempt || 0;
        const studentOtpTiming = studentDetails.otpTiming;
        
        const blockedTime = new Date(studentOtpTiming).getTime();
        if (currentTime < blockedTime) {
            return res.status(401).send('Access is currently blocked. Please retry after the designated wait time.')
        }

        if (studentOtpAttempt >= otpAttemptMax) {
            const updatedStudent = await mysqlQuery(/*sql*/`
                UPDATE 
                    student SET 
                    otp = null,
                    otpAttempt = null, 
                    otpTiming = DATE_ADD(NOW(), INTERVAL 3 HOUR)
                WHERE emailId = ? AND deletedAt IS NULL `,
                [emailId], mysqlClient)

            req.session.destroy(err => {
                if (err) {
                    return res.status(500).send('Error destroying session.');
                }

                if (updatedStudent.affectedRows === 0) {
                    return res.status(404).send('Oops! Something went wrong. Please contact warden or admin.')
                }
                return res.status(401).send('You are temporarily blocked. Please try again in 3 hours.')
            });
        }

        if (otp === studentOtp) {
            const studentLog = await mysqlQuery(/*sql*/`
                UPDATE 
                    student SET
                    otp = null,
                    otpTiming = null
                WHERE emailId = ? AND deletedAt IS NULL`,
                [emailId], mysqlClient)

            if (studentLog.affectedRows === 0) {
                return res.status(404).send('Oops! Something went wrong. Please contact admin.')
            } else {
                req.session.studentInfo = {
                    studentId: studentId,
                    name: studentName,
                    regNo: studentRegNo

                }
                req.session.isLoggedStudent = true
                const student = await studentDetailsData(studentId, mysqlClient)
                return res.status(200).send(student)
            }
        } else {
            if (studentOtpAttempt === 2) {
                var updateBlockedTime = await mysqlQuery(/*sql*/`
                    UPDATE
                        student SET
                        otp = null,
                        otpAttempt = null,
                        otpTiming = DATE_ADD(NOW(), INTERVAL 3 HOUR) 
                    WHERE emailId = ? AND deletedAt IS NULL`,
                    [emailId], mysqlClient)

                if (updateBlockedTime.affectedRows === 0) {
                    return res.status(404).send('Oops! Something went wrong. Please contact warden or admin.')
                } else {
                    req.session.isLoggedStudent = false;
                    req.session.student = NULL;
                }
                return res.status(401).send('You are temporarily blocked. Please try again in 3 hours.')
            } else {
                var updateOtpAttempt = await mysqlQuery(/*sql*/`
                    UPDATE 
                        student SET 
                        otpAttempt = ? + 1
                    WHERE emailId = ? AND deletedAt IS NULL`,
                    [studentOtpAttempt, emailId], mysqlClient)

                if (updateOtpAttempt.affectedRows === 0) {
                    return res.status(404).send('Oops! Something went wrong. Please contact warden or admin.')
                }
                return res.status(400).send({ errorType: 'OTP', message: 'Invalid OTP. Please try again.' })
            }
        }
    } catch (error) {
        req.log.error(error)
        return res.status(500).send(error.message)
    }
}

async function studentAttendanceReport(req, res) {
    const mysqlClient = req.app.mysqlClient
    const studentName = req.session.studentInfo.name
    const registerNumber = req.session.studentInfo.regNo
    const {
        month,
        year
    } = req.query
    var errors = []
    let queryParameters = [month, year, studentName, registerNumber]

    if (isNaN(month)) {
        errors.push('month')
    }

    if (isNaN(year)) {
        errors.push('year')
    }

    if (errors.length > 0) {
        let errorMessage;
        if (errors.length === 1) {
            errorMessage = `Please select a ${errors[0]} before generating the report.`
        } else {
            errorMessage = `Please select a ${errors.join(", ")} before generating the report.`
        }
        return res.status(400).send(errorMessage)
    }

    try {
        let sqlQuery = /*sql*/`
        SELECT 
            DATE_FORMAT(a.checkInDate, "%Y-%m-%d") AS checkIn,
            a.isPresent
        FROM 
            attendance AS a
        INNER JOIN 
            student AS s ON s.studentId = a.studentId
        WHERE 
            MONTH(a.checkInDate) = ?
            AND YEAR(a.checkInDate) = ?
            AND s.name = ?
            AND s.registerNumber = ?`
        const studentReport = await mysqlQuery(sqlQuery, queryParameters, mysqlClient)

        if (studentReport.length === 0) {
            return res.status(404).send('Student attendance report not found for the selected month and year.')
        }

        const formattedReport = studentReport.reduce((acc, { checkIn, isPresent }) => {
            acc[checkIn] = isPresent;
            return acc;
        }, {});

        return res.status(200).send(formattedReport);
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

function studentLogout(req, res) {
    req.session.destroy((err) => {
        if (err) logger.error()
    })
    console.log(req.session)
    res.status(200).send('Logout successfully')
}

function readStudentImageById(req, res) {
    const studentId = req.session.studentInfo.studentId;
    try {
        var fileName = `${studentId}.jpg`;
        const baseDir = path.join(__dirname, '..', 'studentuploads');
        const imagePath = path.join(baseDir, fileName);
        const defaultImagePath = path.join(baseDir, 'studentdefault.jpg');

        const imageToServe = fs.existsSync(imagePath) ? imagePath : defaultImagePath;

        res.setHeader('Content-Type', 'image/jpeg');
        fs.createReadStream(imageToServe).pipe(res);
    } catch (error) {
        req.log.error(error);
        res.status(500).send(error.message);
    }
}

async function readStudentName(req, res) {
    console.log('hiiiiiiiii')
    const mysqlClient = req.app.mysqlClient;
    const studentId = req.session.studentInfo.studentId;
 
    try {
        const [student] = await mysqlQuery(/*sql*/`
            SELECT 
                name
            FROM student 
            WHERE studentId = ? 
                AND deletedAt IS NULL`,
            [studentId]
        , mysqlClient)

        if (!student) {
            return res.status(404).send('Student not found');
        }
        res.status(200).send(student)
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function updateImage(req, res) {
    let uploadedFilePath;
    const studentId = req.session.studentInfo.studentId;
    const uploadedFile = req.file;

    try {
        if (studentId !== req.session.studentInfo.studentId) {
            return res.status(409).send('Student is not valid to edit.');
        }

        if (!uploadedFile) {
            return res.status(400).send('No file uploaded.');
        }

        if (req.fileValidationError) {
            return res.status(400).send(req.fileValidationError);
        }

        uploadedFilePath = req.file.path;
        await sharp(fs.readFileSync(uploadedFilePath))
            .resize({
                width: parseInt(process.env.IMAGE_WIDTH),
                height: parseInt(process.env.IMAGE_HEIGHT),
                fit: sharp.fit.cover,
                position: sharp.strategy.center,
            })
            .toFile(uploadedFilePath);
            
        return res.status(200).json('Image updated successfully');
    } catch (error) {
        req.log.error(error)
        res.status(500).json(error);
    }
}

async function deleteImage(req, res) {
    const studentId = req.session.studentInfo.studentId;

    if (studentId !== req.session.studentInfo.studentId) {
        return res.status(409).send('Student is not valid to delete image.')
    }

    try {
        const rootDir = path.resolve(__dirname, '../');
        const imagePath = path.join(rootDir, 'studentuploads', `${studentId}.jpg`);

        await deleteFile(imagePath, fs);
        res.status(200).send('Image deleted successfully');
    } catch (error) {
        req.log.error(error)
        res.status(500).send('Internal Server Error');
    }
}

module.exports = (app) => {
    app.get('/api/student/name', readStudentName)
    app.get('/api/student/image', readStudentImageById)
    app.delete('/api/student/deleteimage', deleteImage)
    app.post('/api/student/generateotp', generateOtp)
    app.put('/api/student/verifyotp/authentication', verifyOtpStudentAuthentication)
    app.get('/api/student/attendancereport', studentAttendanceReport)
    app.get('/api/student/logout', studentLogout)
    app.put('/api/student/editimage', multerMiddleware, updateImage)
}
