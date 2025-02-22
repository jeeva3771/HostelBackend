const { mysqlQuery } = require('../utilityclient/query')
const ALLOWED_UPDATE_KEYS = [
    'blockFloorId',
    'blockId',
    'roomNumber',
    'roomCapacity',
    'isActive',
    'isAirConditioner'
]

async function readRooms(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const page = req.query.page ? parseInt(req.query.page) : null;
    const offset = limit && page ? (page - 1) * limit : null;
    const orderBy = req.query.orderby;
    const sort = req.query.sort;
    const searchQuery = req.query.search || '';
    const searchPattern = `%${searchQuery}%`;
    let queryParameters = null;

    let roomsQuery = /*sql*/`
        SELECT 
            r.*,
            b.floorNumber,
            bk.blockCode,
            w.firstName AS createdFirstName,
            w.lastName AS createdLastName,
            DATE_FORMAT(r.createdAt, "%y-%b-%D %r") AS createdTimeStamp
            FROM room AS r
            LEFT JOIN 
               blockfloor AS b ON b.blockFloorId = r.blockFloorId
            LEFT JOIN 
               block AS bk ON bk.blockId = r.blockId
            LEFT JOIN 
               warden AS w ON w.wardenId = r.createdBy
            WHERE 
              r.deletedAt IS NULL 
            AND (bk.blockCode LIKE ? OR b.floorNumber LIKE ? OR r.roomNumber LIKE ? OR r.isActive LIKE ? OR
            w.firstName LIKE ? OR w.lastName Like ?)
            ORDER BY ${orderBy} ${sort}`

    let countQuery = /*sql*/ `
            SELECT 
                COUNT(*) AS totalRoomCount 
            FROM room AS r
            LEFT JOIN 
                blockfloor AS b ON b.blockFloorId = r.blockFloorId
            LEFT JOIN 
                block AS bk ON bk.blockId = r.blockId
            LEFT JOIN 
                warden AS w ON w.wardenId = r.createdBy
            WHERE 
                r.deletedAt IS NULL 
            AND (bk.blockCode LIKE ? OR b.floorNumber LIKE ? OR r.roomNumber LIKE ? OR r.isActive LIKE ? OR
                w.firstName LIKE ? OR w.lastName Like ?)
            ORDER BY ${orderBy} ${sort}`;

    if (limit >= 0) {
        roomsQuery += ' LIMIT ? OFFSET ?';
        queryParameters = [searchPattern, searchPattern, searchPattern, searchPattern,
            searchPattern, searchPattern, limit, offset];
    } else {
        queryParameters = [searchPattern, searchPattern, searchPattern, searchPattern,
            searchPattern, searchPattern];
    }

    const countQueryParameters = [searchPattern, searchPattern, searchPattern,
        searchPattern, searchPattern, searchPattern];

    try {
        const [rooms, totalCount] = await Promise.all([
            mysqlQuery(roomsQuery, queryParameters, mysqlClient),
            mysqlQuery(countQuery, countQueryParameters, mysqlClient)
        ]);

        res.status(200).send({
            rooms: rooms,
            roomCount: totalCount[0].totalRoomCount
        });

    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message);
    }
}

async function readRoomById(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const roomId = req.params.roomId;
    try {
        const room = await mysqlQuery(/*sql*/`
            SELECT 
            r.*,
            b.floorNumber,
            bk.blockCode,
            w.firstName AS createdFirstName,
            w.lastName AS createdLastName,
            w2.firstName AS updatedFirstName,
            w2.lastName AS updatedLastName,
            DATE_FORMAT(r.createdAt, "%y-%b-%D %r") AS createdTimeStamp,
            DATE_FORMAT(r.updatedAt, "%y-%b-%D %r") AS updatedTimeStamp
            FROM room AS r
            LEFT JOIN 
               blockfloor AS b ON b.blockFloorId = r.blockFloorId
            LEFT JOIN 
               block AS bk ON bk.blockId = r.blockId
            LEFT JOIN 
               warden AS w ON w.wardenId = r.createdBy
            LEFT JOIN 
              warden AS w2 ON w2.wardenId = r.updatedBy
            WHERE 
              r.deletedAt IS NULL AND roomId = ?`,
            [roomId],
            mysqlClient
        )
        if (room.length === 0) {
            return res.status(404).send("RoomId not valid");
        }
        res.status(200).send(room[0])
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function readRoomNumberByBlockFloorId(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const blockFloorId = req.query.blockFloorId;

    try {
        const roomNumberByBlockFloorId = await mysqlQuery(/*sql*/`
            SELECT 
                roomId, roomNumber, roomCapacity, isAirConditioner,
                (SELECT COUNT(*)
                 FROM student AS s
                 WHERE s.roomId = r.roomId
                 AND s.deletedAt IS NULL) AS studentCount
            FROM room AS r
            WHERE r.blockFloorId = ?
                AND r.isActive = 1
                AND r.deletedAt IS NULL 
            ORDER BY r.roomNumber ASC`, [blockFloorId], mysqlClient);

        if (roomNumberByBlockFloorId.length === 0) {
            return res.status(404).send('No rooms found');
        }

        const enrichedRooms = roomNumberByBlockFloorId.map(room => ({
            room,
            isFull: room.studentCount >= room.roomCapacity
        }));

        res.status(200).send(enrichedRooms)
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function createRoom(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const {
        blockFloorId,
        blockId,
        roomNumber,
        roomCapacity,
        isActive,
        isAirConditioner
    } = req.body;
    const createdBy = req.session.warden.wardenId;

    try {
        const validateInsert = await validatePayload(req.body, false, roomId = null, mysqlClient);
        if (validateInsert.length > 0) {
            return res.status(400).send(validateInsert);
        }

        const newRoom = await mysqlQuery(/*sql*/`INSERT INTO 
            room(blockFloorId,blockId,roomNumber,roomCapacity,isActive,isAirConditioner,createdBy) 
            VALUES(?,?,?,?,?,?,?)`,
            [blockFloorId, blockId, roomNumber, roomCapacity, isActive, isAirConditioner, createdBy],
            mysqlClient
        )
        if (newRoom.affectedRows === 0) {
            res.status(400).send({error:"No insert was made"})
        } else {
            res.status(201).send("Insert Successfully")
        }
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function updateRoomById(req, res) {
    const roomId = req.params.roomId;
    const mysqlClient = req.app.mysqlClient;
    const updatedBy = req.session.warden.wardenId;

    const values = []
    const updates = []

    ALLOWED_UPDATE_KEYS.forEach(key => {
        const keyValue = req.body[key]
        if (keyValue !== undefined) {
            values.push(keyValue)
            updates.push(` ${key} = ?`)
        }
    })

    updates.push('updatedBy = ?')
    values.push(updatedBy, roomId)

    try {
        const room = await validateRoomById(roomId, mysqlClient)
        if (!room) {
            return res.status(404).send({error:"Room not found or already deleted"});
        }

        const validateInsert = await validatePayload(req.body, true, roomId, mysqlClient);
        if (validateInsert.length > 0) {
            return res.status(400).send(validateInsert)
        }

        const isUpdate = await mysqlQuery(/*sql*/`UPDATE room SET ${updates.join(', ')} WHERE roomId = ? 
            AND deletedAt IS NULL`,
            values, mysqlClient)
        if (isUpdate.affectedRows === 0) {
            res.status(204).send({error:"Room not found or no changes made"})
        }

        const getUpdatedRoom = await mysqlQuery(/*sql*/`SELECT * FROM room WHERE roomId = ?`, [roomId], mysqlClient)
        res.status(200).send({
            status: 'successfull',
            data: getUpdatedRoom[0]
        })
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function deleteRoomById(req, res) {
    const roomId = req.params.roomId;
    const mysqlClient = req.app.mysqlClient;
    const deletedBy = req.session.warden.wardenId;

    try {
        const isValid = await validateRoomById(roomId, mysqlClient)
        if (!isValid) {
            return res.status(404).send("roomId is not defined")
        }

        const [checkStudentInRoom] = await mysqlQuery(/*sql*/`
            SELECT COUNT(*) AS count FROM student 
            WHERE roomId = ?
            AND deletedAt IS NULL`, 
            [roomId]
        , mysqlClient)


        if (checkStudentInRoom.count > 0) {
            return res.status(409).send('Students in a room shift to another room and then try to delete.')
        }

        const deletedRoom = await mysqlQuery(/*sql*/`
            UPDATE room SET 
                roomNumber = CONCAT(IFNULL(roomNumber, ''), '-', NOW()), 
                deletedAt = NOW(), 
                deletedBy = ? 
            WHERE roomId = ? 
            AND deletedAt IS NULL`,
            [deletedBy, roomId]
        , mysqlClient
        )

        if (deletedRoom.affectedRows === 0) {
            return res.status(404).send("Room not found or already deleted")
        }

        const getDeletedBlock = await mysqlQuery(/*sql*/`SELECT * FROM room WHERE roomId = ? `,
            [roomId], mysqlClient)

        res.status(200).send({
            status: 'deleted',
            data: getDeletedBlock[0]
        });
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

function getRoomById(roomId, mysqlClient) {
    return new Promise((resolve, reject) => {
        var query = /*sql*/`SELECT COUNT(*) AS count FROM room WHERE roomId = ? AND deletedAt IS NULL`
        mysqlClient.query(query, [roomId], (err, room) => {
            if (err) {
                return reject(err)
            }
            resolve(room[0].count ? room[0] : null)
        })
    })
}

async function validateRoomById(roomId, mysqlClient) {
    var room = await getRoomById(roomId, mysqlClient)
    if (room !== null) {
        return true
    }
    return false
}

async function validatePayload(body, isUpdate = false, roomId = null, mysqlClient) {
    const {
        blockFloorId,
        blockId,
        roomNumber,
        roomCapacity,
        isActive,
        isAirConditioner
    } = body;

    const errors = []

    if (blockFloorId !== undefined) {
        if (isNaN(blockFloorId) || blockFloorId <= 0) {
            errors.push('BlockFloorId is invalid')
        }
    } else {
        errors.push('BlockFloorId is missing')
    }

    if (blockId !== undefined) {
        if (isNaN(blockId) || blockId <= 0) {
            errors.push('BlockId is invalid')
        }
    } else {
        errors.push('BlockId is missing')
    }

    if (roomCapacity !== undefined) {
        if (isNaN(roomCapacity) || roomCapacity < 0) {
            errors.push('Room Capacity is invalid')
        } else if (isUpdate === true) {
            const validateRoomCapacity = await mysqlQuery(/*sql*/`
                SELECT 
                    COUNT(*) AS studentCount
                FROM student 
                WHERE roomId = ?
                AND deletedAt IS NULL`, [roomId]
                , mysqlClient)
                if (validateRoomCapacity[0].studentCount > roomCapacity) {
                    errors.push('Transfer a student to another room and attempt to reduce the capacity of this room.')
                }
            }
        } else {
            errors.push('Room Capacity is missing')
        }

    if (roomNumber !== undefined) {
        if (isNaN(roomNumber) || roomNumber <= 0) {
            errors.push('Room Number is invalid')
        } else {
            let query;
            let params;

            if (isUpdate === true) {
                query = /*sql*/`
                    SELECT 
                        COUNT(*) AS count 
                    FROM room 
                    WHERE blockId = ? 
                        AND blockFloorId = ? 
                        AND roomNumber = ? 
                        AND roomId != ? 
                        AND deletedAt IS NULL`;

                params = [blockId, blockFloorId, roomNumber, roomId];
            } else {
                query = /*sql*/`
                    SELECT 
                        COUNT(*) AS count
                    FROM room 
                    WHERE blockId = ? 
                        AND blockFloorId = ?
                        AND roomNumber = ?
                        AND deletedAt IS NULL`;

                params = [blockId, blockFloorId, roomNumber];
            }

            const validateRoomNumber = await mysqlQuery(query, params, mysqlClient);
            if (validateRoomNumber[0].count > 0) {
                errors.push("Room Number already exists");
            }
        }
    } else {
        errors.push('Room Number is missing')
    }

    if (isActive !== undefined) {
        if (![0, 1].includes(isActive)) {
            errors.push('isActive is invalid')
        }
    } else {
        errors.push('isActive is missing')
    }

    if (isAirConditioner !== undefined) {
        if (![0, 1].includes(isAirConditioner)) {
            errors.push('isAirConditioner is invalid')
        } else if (isUpdate === true && isActive === 0) {
            const validateStudentInRoom = await mysqlQuery(/*sql*/`
                SELECT 
                    COUNT(*) AS count 
                FROM student 
                WHERE 
                    roomId = ? 
                    AND deletedAt IS NULL`, 
                [roomId]
            , mysqlClient)
            
            if (validateStudentInRoom[0].count > 0) {
                errors.push("Students in room shift to another room and then try to inactive.")
            }
        }
    } else {
        errors.push('isAirConditioner is missing')
    }
    return errors
}

module.exports = (app) => {
    app.get('/api/room', readRooms)
    app.get('/api/room/roomnumber', readRoomNumberByBlockFloorId)
    app.get('/api/room/:roomId', readRoomById)
    app.post('/api/room', createRoom)
    app.put('/api/room/:roomId', updateRoomById)
    app.delete('/api/room/:roomId', deleteRoomById)
}
