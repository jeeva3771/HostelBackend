const { mysqlQuery } = require('../utilityclient/query');

async function readBlockCount(req, res) {
    const mysqlClient = req.app.mysqlClient;
    try {
        const getBlockCount = await mysqlQuery(/*sql*/`
            SELECT 
                COUNT(*) AS totalBlockCount 
            FROM 
                block 
            WHERE 
                deletedAt IS NULL`, [], mysqlClient)

        if (getBlockCount[0].totalBlockCount === 0) {
            return res.status(404).send('No Block found')
        }
        res.status(200).send(getBlockCount[0])
    } catch (error) {
        req.log.error(error);
        res.status(500).send(error.message)
    }
}

async function readFloorCount(req, res) {
    const mysqlClient = req.app.mysqlClient;
    try {
        const getFloorCount = await mysqlQuery(/*sql*/`
            SELECT 
                COUNT(*) AS totalFloorCount 
            FROM 
                blockfloor
            WHERE 
                deletedAt IS NULL`, [], mysqlClient)

        if (getFloorCount[0].totalFloorCount === 0) {
            return res.status(404).send('No floor found')
        }
        res.status(200).send(getFloorCount[0])
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function readRoomCount(req, res) {
    const mysqlClient = req.app.mysqlClient;
    try {
        const getRoomCount = await mysqlQuery(/*sql*/`
            SELECT 
                COUNT(*) AS totalRoomCount 
            FROM 
                room
            WHERE 
                deletedAt IS NULL`, [], mysqlClient)

        if (getRoomCount[0].totalRoomCount === 0) {
            return res.status(404).send('No Room found')
        }
        res.status(200).send(getRoomCount[0])
    } catch (error) {
        req.log.error(error);
        res.status(500).send(error.message)
    }
}

async function readCourseCount(req, res) {
    const mysqlClient = req.app.mysqlClient;
    try {
        const getCourseCount = await mysqlQuery(/*sql*/`
            SELECT 
                COUNT(*) AS totalCourseCount 
            FROM 
                course
            WHERE 
                deletedAt IS NULL`, [], mysqlClient)

        if (getCourseCount[0].totalCourseCount === 0) {
            return res.status(404).send('No Course found')
        }
        res.status(200).send(getCourseCount[0])
    } catch (error) {
        req.log.error(error);
        res.status(500).send(error.message)
    }
}

async function readStudentCount(req, res) {
    const mysqlClient = req.app.mysqlClient;
    try {
        const getStudentCount = await mysqlQuery(/*sql*/`
            SELECT 
                COUNT(*) AS totalStudentCount 
            FROM 
                student
            WHERE 
                deletedAt IS NULL`, [], mysqlClient)

        if (getStudentCount[0].totalStudentCount === 0) {
            return res.status(404).send('No Student found')
        }
        res.status(200).send(getStudentCount[0])
    } catch (error) {
        req.log.error(error);
        res.status(500).send(error.message)
    }
}

async function readWardenCount(req, res) {
    const mysqlClient = req.app.mysqlClient;
    try {
        const getWardenCount = await mysqlQuery(/*sql*/`
            SELECT 
                COUNT(*) AS totalWardenCount 
            FROM 
                warden
            WHERE 
                deletedAt IS NULL`, [], mysqlClient)

        if (getWardenCount[0].totalWardenCount === 0) {
            return res.status(404).send('No Warden found')
        }
        res.status(200).send(getWardenCount[0])
    } catch (error) {
        req.log.error(error);
        res.status(500).send(error.message)
    }
}

module.exports = (app) => {
    app.get('/api/block/blockcount/block', readBlockCount)
    app.get('/api/blockfloor/blockfloorcount/floor', readFloorCount)
    app.get('/api/room/roomcount/room', readRoomCount)
    app.get('/api/course/coursecount/course', readCourseCount)
    app.get('/api/student/studentcount/student', readStudentCount)
    app.get('/api/warden/wardencount/warden', readWardenCount)
}