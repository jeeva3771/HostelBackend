const { mysqlQuery } = require('../utilityclient/query')

async function readAttendances(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const page = req.query.page ? parseInt(req.query.page) : null;
    const offset = limit && page ? (page - 1) * limit : null;
    const orderBy = req.query.orderby;
    const sort = req.query.sort;
    const searchQuery = req.query.search || '';
    const searchPattern = `%${searchQuery}%`;
    let queryParameters = null;

    var attendancesQuery = /*sql*/`
        SELECT 
            a.*,
            s.name,
            s2.registerNumber,
            r.roomNumber,
            b.floorNumber,
            bk.blockCode,
            DATE_FORMAT(a.checkInDate, "%y-%b-%D") AS checkIn,
            DATE_FORMAT(a.createdAt, "%y-%b-%D %r") AS createdTimeStamp
        FROM attendance AS a
        LEFT JOIN
            student AS s ON s.studentId = a.studentId
        LEFT JOIN
            student AS s2 ON s2.studentId = a.studentId
        LEFT JOIN 
            room AS r ON r.roomId = a.roomId  
        LEFT JOIN 
            blockfloor AS b ON b.blockFloorId = a.blockFloorId 
        LEFT JOIN 
            block AS bk ON bk.blockId = a.blockId
        WHERE
            (s.name LIKE ? OR S2.registerNumber LIKE ? OR bk.blockCode LIKE ? OR b.floorNumber LIKE ?
            OR r.roomNumber LIKE ? OR a.isPresent LIKE ?)
        ORDER BY 
            ${orderBy} ${sort}`;

    const countQuery = /*sql*/ `
        SELECT 
            COUNT(*) AS totalAttendanceCount 
        FROM attendance AS a
        LEFT JOIN
            student AS s ON s.studentId = a.studentId
        LEFT JOIN
            student AS s2 ON s2.studentId = a.studentId
        LEFT JOIN 
            room AS r ON r.roomId = a.roomId  
        LEFT JOIN 
            blockfloor AS b ON b.blockFloorId = a.blockFloorId 
        LEFT JOIN 
            block AS bk ON bk.blockId = a.blockId
        WHERE
            (s.name LIKE ? OR S2.registerNumber LIKE ? OR bk.blockCode LIKE ? OR b.floorNumber LIKE ?
            OR r.roomNumber LIKE ? OR a.isPresent LIKE ?)
        ORDER BY 
            ${orderBy} ${sort}`;

    if (limit >= 0) {
        attendancesQuery += ' LIMIT ? OFFSET ?';
        queryParameters = [searchPattern, searchPattern, searchPattern, 
            searchPattern, searchPattern, searchPattern, limit, offset];
    } else {
        queryParameters = [searchPattern, searchPattern, searchPattern,
            searchPattern, searchPattern, searchPattern];
    }

    const countQueryParameters = [searchPattern, searchPattern, searchPattern,
        searchPattern, searchPattern, searchPattern];

    try {
        const [attendances, totalCount] = await Promise.all([
            mysqlQuery(attendancesQuery, queryParameters, mysqlClient),
            mysqlQuery(countQuery, countQueryParameters, mysqlClient)
        ]);

        res.status(200).send({
            attendances: attendances,
            attendanceCount: totalCount[0].totalAttendanceCount
        });

    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message);
    }
}

async function readAttendanceById(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const attendanceId = req.params.attendanceId;

    try {
        const attendance = await mysqlQuery(/*sql*/`
        SELECT 
            a.*,
            s.name,
            s2.registerNumber,
            r.roomNumber,
            b.floorNumber,
            bk.blockCode,
            w.firstName AS reviewedWardenFirstName,
            w.LastName AS reviewedWardenLastName,
            w2.firstName AS updatedWardenFirstName,
            w2.LastName AS updatedWardenLastName,
        DATE_FORMAT(a.checkInDate, "%y-%b-%D") AS checkIn,
        DATE_FORMAT(a.createdAt, "%y-%b-%D %r") AS createdTimeStamp,
        DATE_FORMAT(a.updatedAt, "%y-%b-%D %r") AS updatedTimeStamp
        FROM attendance AS a
        LEFT JOIN
            student AS s ON s.studentId = a.studentId
        LEFT JOIN
            student AS s2 ON s2.studentId = a.studentId
        LEFT JOIN 
            room AS r ON r.roomId = a.roomId  
        LEFT JOIN 
            blockfloor AS b ON b.blockFloorId = a.blockFloorId 
        LEFT JOIN 
            block AS bk ON bk.blockId = a.blockId
        LEFT JOIN
            warden AS w ON w.wardenId = a.wardenId
        LEFT JOIN 
            warden AS w2 ON w2.wardenId = a.updatedBy 
        WHERE 
            attendanceId = ?`,
            [attendanceId],
            mysqlClient
        );

        if (attendance.length === 0) {
            return res.status(404).send("attendanceId not valid");
        }
        res.status(200).send(attendance[0])
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function readBlocksAndStudentCountAndAttendanceCount(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const date = req.query.date;

    try {
        const getBlocksStudentCountAndAttendanceCount = await mysqlQuery(/*sql*/`
            SELECT 
                bk.blockId,
                bk.blockCode,
                COUNT(s.blockId) AS studentsCount, 
                COUNT(a.checkInDate) AS attendanceCount
            FROM block AS bk
            LEFT JOIN 
                student s ON bk.blockId = s.blockId AND s.deletedAt IS NULL
            LEFT JOIN 
                attendance a ON a.studentId = s.studentId AND a.checkInDate = ?
            WHERE 
                bk.deletedAt IS NULL AND bk.isActive = 1
            GROUP BY 
                bk.blockId
            ORDER BY 
                bk.blockCode ASC`,
            [date], mysqlClient)

        if (getBlocksStudentCountAndAttendanceCount.length === 0) {
            return res.status(404).send('No Block is Found')
        }

        res.status(200).send(getBlocksStudentCountAndAttendanceCount)
    } catch (error) {
        console.log(error)
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function readBlockFloorsAndStudentCountAndAttendanceCount(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const {
        date,
        blockId
    } = req.query

    try {
        const getBlockFloorsStudentCountAndAttendanceCount = await mysqlQuery(/*sql*/`
                SELECT 
                    b.blockFloorId,
                    b.floorNumber,
                    count(s.blockFloorId) AS studentsCount, 
                    count(a.checkInDate) AS attendanceCount
                FROM blockfloor AS b
                LEFT JOIN 
                    student s ON b.blockFloorId = s.blockFloorId AND s.deletedAt IS NULL
                LEFT JOIN 
                    attendance a ON a.studentId = s.studentId AND a.checkInDate = ?
                WHERE 
                    b.deletedAt is null and b.isActive = 1 and b.blockId = ?
                GROUP BY 
                    b.blockFloorId
                ORDER BY 
                    b.floorNumber ASC`, 
                [date, blockId], mysqlClient)

        if (getBlockFloorsStudentCountAndAttendanceCount.length === 0) {
            return res.status(404).send('No Blockfloor is Found')
        }

        res.status(200).send(getBlockFloorsStudentCountAndAttendanceCount)
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function readRoomsAndStudentCountAndAttendanceCount(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const {
        date,
        blockFloorId
    } = req.query;

    try {
        const getRoomsStudentCountAndAttendanceCount = await mysqlQuery(/*sql*/`
            SELECT 
                r.roomId,
                r.roomNumber,
                count(s.roomId) AS studentsCount, 
                count(a.checkInDate) AS attendanceCount
            FROM room AS r
            LEFT JOIN 
                student s ON r.roomId = s.roomId AND s.deletedAt IS NULL
            LEFT JOIN 
                attendance a ON a.studentId = s.studentId AND a.checkInDate = ?
            WHERE 
                r.deletedAt IS NULL AND r.isActive = 1 AND r.blockFloorId = ?
            GROUP BY 
                r.roomId
            ORDER BY 
                r.roomNumber ASC`, [date, blockFloorId], mysqlClient)

            if (getRoomsStudentCountAndAttendanceCount.length === 0) {
                return res.status(404).send('No Room is found')
            }

            res.status(200).send(getRoomsStudentCountAndAttendanceCount)
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function readRoomStudents(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const { roomId } = req.params;
    const { checkIn } = req.query;

    try {
        const studentsWithAttendance = await mysqlQuery(
            /*sql*/ `
            SELECT 
                s.studentId, s.name, a.isPresent, a.checkInDate
            FROM student AS s
            LEFT JOIN 
                attendance AS a ON s.studentId = a.studentId AND a.roomId = ? AND a.checkInDate = ?
            WHERE 
                s.roomId = ? AND s.deletedAt IS NULL`,
            [roomId, checkIn, roomId],
            mysqlClient
        );

        if (studentsWithAttendance.length === 0) {
            return res.status(404).send('No students found for the specified room.');
        }

        res.status(200).send(studentsWithAttendance);
    } catch (error) {
        console.log(error)
        req.log.error(error)
        res.status(500).send('Error fetching student and attendance data: ' + error.message);
    }
};

async function addOrEditAttendance(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const { blockId, blockFloorId, roomId } = req.params;
    const { checkInDate, attendance } = req.body;
    const wardenId = req.session.warden.wardenId;
    console.log(attendance)

    try {
        const errors = await validatePayload(req.params, mysqlClient);
        if (errors.length > 0) {
            return res.status(400).send(errors);
        }

        const attendancePromises = attendance.map(({ studentId, isPresent }) => {
            return mysqlQuery(/*sql*/ `
                    INSERT INTO attendance (studentId, roomId, blockId, blockFloorId, 
                        checkInDate, isPresent, wardenId)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        checkInDate = VALUES(checkInDate),
                        isPresent = VALUES(isPresent),
                        wardenId = VALUES(wardenId)`,
                [studentId, roomId, blockId, blockFloorId, checkInDate, isPresent, wardenId],
                mysqlClient
            );
        });

        await Promise.all(attendancePromises);
        res.status(200).send('Attendance successfully recorded.');
    }  catch (error) {
        req.log.error(error)
        res.status(500).send(error.message);
    }
}

async function studentAttendanceReport(req, res) {    
    const mysqlClient = req.app.mysqlClient;
    const {
        month,
        year,
        studentName,
    } = req.query;
    var errors = []
    let queryParameters = [month, year, studentName];

    if (isNaN(month)) {
        errors.push('month')
    }

    if (isNaN(year)) {
        errors.push('year')
    }

    if (studentName === "Select a Student") {
        errors.push('student')
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
            AND s.name = ?`;
        
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

async function validatePayload(params, mysqlClient) {
    const {
        roomId,
        blockFloorId,
        blockId
    } = params;

    const errors = [];

    if (roomId !== undefined) {
        if (isNaN(roomId) || roomId <= 0) {
            errors.push('roomId is invalid')
        }
    } else {
        errors.push('roomId is missing')
    }

    if (blockFloorId !== undefined) {
        if (isNaN(blockFloorId) || blockFloorId <= 0) {
            errors.push('blockFloorId is invalid')
        }
    } else {
        errors.push('blockFloorId is missing')
    }

    if (blockId !== undefined) {
        if (isNaN(blockId) || blockId <= 0) {
            errors.push('blockId is invalid')
        }
    } else {
        errors.push('blockId is missing')
    }

    const isValidateEntry = await mysqlQuery(/*sql*/ `
        SELECT studentId FROM student 
        WHERE 
            blockId = ? 
            AND blockFloorId = ?
            AND  roomId = ?`,
        [blockId, blockFloorId, roomId]
    , mysqlClient)

    if (isValidateEntry.length === 0) {
        errors.push('RoomId or BlockFloorId or BlockId is not valid')
    }
    return errors
}

module.exports = (app) => {
    app.get('/api/attendance', readAttendances)
    app.get('/api/attendance/studentattendancereport', studentAttendanceReport)
    app.get('/api/attendance/block', readBlocksAndStudentCountAndAttendanceCount)
    app.get('/api/attendance/blockfloor', readBlockFloorsAndStudentCountAndAttendanceCount)
    app.get('/api/attendance/room', readRoomsAndStudentCountAndAttendanceCount)
    app.get('/api/attendance/:attendanceId', readAttendanceById)
    app.get('/api/attendance/student/:roomId', readRoomStudents)
    app.post('/api/attendance/:blockId/:blockFloorId/:roomId', addOrEditAttendance)
}
