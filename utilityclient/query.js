const bcrypt = require('bcrypt')

function mysqlQuery(sql, options, mysqlClient) {
    return new Promise((resolve, reject) => {
        try {
            mysqlClient.query(sql, options || [], (err, data) => {
                if (err) {
                    return reject(err.sqlMessage)
                }
                resolve(data)
            })
        } catch (error) {
            reject(error.message)
        }
    })
}

function deleteFile(uploadedFilePath, fs) {
    return new Promise((resolve, reject) => {

        if (!fs.existsSync(uploadedFilePath)) {
            return resolve()
        }

        fs.unlink(uploadedFilePath, (err) => {
            if (err) {
                return reject(err)
            }
            resolve()
        })
    })
}

function hashPassword(password) {
    return bcrypt.hash(password, parseInt(process.env.HASH_SALTROUNDS))
}

function isPasswordValid(enteredPassword, storedHashedPassword) {
    return bcrypt.compare(enteredPassword, storedHashedPassword)
}

async function studentDetailsData(studentId, mysqlClient) {
    const [student] = await mysqlQuery(/*sql*/`
        SELECT 
            s.*,
            bk.blockCode,
            b.floorNumber,
            r.roomNumber,
            c.courseName,
            DATE_FORMAT(s.dob, "%y-%b-%D") AS birth,
            DATE_FORMAT(s.joinedDate, "%y-%b-%D") AS joinDate,
            DATE_FORMAT(s.createdAt, "%y-%b-%D %r") AS createdTimeStamp
        FROM student AS s
        LEFT JOIN block AS bk ON bk.blockId = s.blockId
        LEFT JOIN blockfloor AS b ON b.blockFloorId = s.blockFloorId
        LEFT JOIN room AS r ON r.roomId = s.roomId
        LEFT JOIN course AS c ON c.courseId = s.courseId
        WHERE 
            s.deletedAt IS NULL 
            AND s.studentId = ?`,
        [studentId],
        mysqlClient
    );

    if (!student) {
        throw new Error('Student not found')
    }

    return student
}

module.exports = {
    mysqlQuery,
    deleteFile,
    hashPassword,
    isPasswordValid,
    studentDetailsData
}



