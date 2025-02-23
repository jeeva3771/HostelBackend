const { mysqlQuery } = require('../utilityclient/query')
const ALLOWED_UPDATE_KEYS = [
    "blockId",
    "floorNumber",
    "isActive"
]

async function readBlockFloors(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const page = req.query.page ? parseInt(req.query.page) : null;
    const offset = limit && page ? (page - 1) * limit : null;
    const orderBy = req.query.orderby || 'b.floorNumber';
    const sort = req.query.sort || 'ASC';
    const searchQuery = req.query.search || '';
    const searchPattern = `%${searchQuery}%`;
    let queryParameters = null;

    let blockFloorsQuery = /*sql*/`
        SELECT 
            b.*,
            bk.blockCode,
            w.firstName AS createdFirstName,
            w.lastName AS createdLastName,
            DATE_FORMAT(b.createdAt, "%y-%b-%D %r") AS createdTimeStamp
            FROM blockfloor AS b
            LEFT JOIN 
              block AS bk ON bk.blockId = b.blockId
            LEFT JOIN 
              warden AS w ON w.wardenId = b.createdBy
            WHERE 
              b.deletedAt IS NULL
            AND (bk.blockCode LIKE ? OR b.floorNumber LIKE ? OR b.isActive LIKE ?
              OR w.firstName LIKE ? OR w.lastName Like ?)
            ORDER BY ${orderBy} ${sort}`;

    let countQuery = /*sql*/ `
        SELECT COUNT(*) AS totalBlockFloorCount 
        FROM blockfloor AS b
        LEFT JOIN 
              block AS bk ON bk.blockId = b.blockId
            LEFT JOIN 
              warden AS w ON w.wardenId = b.createdBy
        WHERE b.deletedAt IS NULL
        AND (bk.blockCode LIKE ? OR b.floorNumber LIKE ? OR b.isActive LIKE ?
            OR w.firstName LIKE ? OR w.lastName Like ?)
        ORDER BY ${orderBy} ${sort}`;

    if (limit >= 0) {
        blockFloorsQuery += ' LIMIT ? OFFSET ?';
        queryParameters = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, limit, offset];
    } else {
        queryParameters = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
    }

    const countQueryParameters = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];

    try {
        const [blockFloors, totalCount] = await Promise.all([
            mysqlQuery(blockFloorsQuery, queryParameters, mysqlClient),
            mysqlQuery(countQuery, countQueryParameters, mysqlClient)
        ]);

        res.status(200).send({
            blockFloors: blockFloors,
            blockFloorCount: totalCount[0].totalBlockFloorCount
        });

    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message);
    }
}

async function readBlockFloorById(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const blockFloorId = req.params.blockfloorId;

    try {
        const blockFloor = await mysqlQuery(/*sql*/`
            SELECT 
            b.*,
            bk.blockCode,
            w.firstName AS createdFirstName,
            w.lastName AS createdLastName,
            w2.firstName AS updatedFirstName,
            w2.lastName AS updatedLastName,
            DATE_FORMAT(b.createdAt, "%y-%b-%D %r") AS createdTimeStamp,
            DATE_FORMAT(b.updatedAt, "%y-%b-%D %r") AS updatedTimeStamp
            FROM blockfloor AS b
            LEFT JOIN 
              block AS bk ON bk.blockId = b.blockId
            LEFT JOIN 
              warden AS w ON w.wardenId = b.createdBy
            LEFT JOIN 
              warden AS w2 ON w2.wardenId = b.updatedBy
            WHERE 
              b.deletedAt IS NULL AND blockFloorId = ?`,
            [blockFloorId],
            mysqlClient
        )

        if (blockFloor.length === 0) {
            return res.status(404).send("BlockFloorId not valid");
        }
        res.status(200).send(blockFloor[0])
    }
    catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function readFloorNumberByBlockId(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const blockId = req.query.blockId;

    try {
        let sqlQuery = /*sql*/`
            SELECT 
                blockFloorId, 
                floorNumber,
                (SELECT COUNT(*)
                FROM room AS r
                WHERE 
                    r.blockFloorId = b.blockFloorId
                    AND r.deletedAt IS NULL) 
                AS roomCount FROM blockfloor AS b
            WHERE 
                b.blockId = ? 
                AND b.isActive = 1
                AND b.deletedAt IS NULL 
            ORDER BY b.floorNumber ASC`;
        const roomBlockFloorCount = await mysqlQuery(sqlQuery, [blockId], mysqlClient);

        if (roomBlockFloorCount.length === 0) {
            return res.status(404).send('Selected block code has no active floors.');
        }
        res.status(200).send(roomBlockFloorCount)
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function createBlockFloor(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const {
        blockId,
        floorNumber,
        isActive
    } = req.body
    const createdBy = req.session.warden.wardenId;

    const validateInsert = await validatePayload(req.body, false, null, mysqlClient);
    if (validateInsert.length > 0) {
        return res.status(400).send(validateInsert);
    }

    try {
        const newBlockFloor = await mysqlQuery(/*sql*/`INSERT INTO blockfloor (blockId,floorNumber,isActive,createdBy)
            VALUES(?,?,?,?)`,
            [blockId, floorNumber, isActive, createdBy],
            mysqlClient
        )
        if (newBlockFloor.affectedRows === 0) {
            res.status(400).send({error:"No insert was made"})
        } else {
            res.status(201).send('insert successfully')
        }
    } catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function updateBlockFloorById(req, res) {
    const blockFloorId = req.params.blockfloorId;
    const mysqlClient = req.app.mysqlClient;
    const values = []
    const updates = []
    const updatedBy = req.session.warden.wardenId;


    ALLOWED_UPDATE_KEYS.forEach(key => {
        const keyValue = req.body[key]
        if (keyValue !== undefined) {
            values.push(keyValue)
            updates.push(` ${key} = ?`)
        }
    })

    values.push(updatedBy, blockFloorId)
    updates.push('updatedBy = ?')

    try {
        const blockFloor = await validateBlockFloorById(blockFloorId, mysqlClient);
        if (!blockFloor) {
            return res.status(404).send({error:"Block not found or already deleted"});
        }

        const validateInsert = await validatePayload(req.body, true, blockFloorId, mysqlClient);
        if (validateInsert.length > 0) {
            return res.status(400).send(validateInsert);
        }

        const isUpdate = await mysqlQuery(/*sql*/`UPDATE blockfloor SET ${updates.join(', ')} WHERE blockfloorId = ?`,
            values,
            mysqlClient
        )
        if (isUpdate.affectedRows === 0) {
            res.status(204).send({error:"Blockfloor not found or no changes made"})
        }

        const getUpdatedBlockFloor = await mysqlQuery(/*sql*/`SELECT * FROM blockfloor WHERE blockfloorId = ?`,
            [blockFloorId],
            mysqlClient
        )
        res.status(200).send({
            status: 'successfull',
            data: getUpdatedBlockFloor[0]
        })
    }
    catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function deleteBlockFloorById(req, res) {
    const blockFloorId = req.params.blockfloorId;
    const mysqlClient = req.app.mysqlClient;
    const deletedBy = req.session.warden.wardenId;

    try {
        const isValid = await validateBlockFloorById(blockFloorId, mysqlClient)
        if (!isValid) {
            return res.status(404).send("blockFloorId is not defined")
        }

        const [checkStudentInBlockFloor] = await mysqlQuery(/*sql*/`
            SELECT COUNT(*) AS count FROM student 
            WHERE blockFloorId = ?
            AND deletedAt IS NULL`, 
            [blockFloorId]
        , mysqlClient)


        if (checkStudentInBlockFloor.count > 0) {
            return res.status(409).send('Students in a blockfloor shift to another blockfloor and then try to delete.')
        }

        const [checkRoomInFloor] = await mysqlQuery(/*sql*/`
            SELECT COUNT(*) AS count FROM room
            WHERE blockFloorId = ? 
            AND deletedAt IS NULL`, 
            [blockFloorId]
        , mysqlClient)

        if (checkRoomInFloor.count > 0) {
            return res.status(409).send('Blockfloor is referenced by a Room and cannot be deleted.')
        }

        const deletedBlockFloor = await mysqlQuery(/*sql*/`
            UPDATE blockfloor SET 
                floorNumber = CONCAT(IFNULL(floorNumber, ''), '-', NOW()),
                deletedAt = NOW(),
                deletedBy = ? 
            WHERE blockfloorId = ? 
            AND deletedAt IS NULL`,
            [deletedBy, blockFloorId]
        , mysqlClient)

        if (deletedBlockFloor.affectedRows === 0) {
            return res.status(404).send("Blockfloor not found or already deleted")
        }

        const getDeletedBlockFloor = await mysqlQuery(/*sql*/`
            SELECT * FROM blockfloor 
            WHERE blockfloorId = ?`,
            [blockFloorId]
        , mysqlClient)

        res.status(200).send({
            status: 'deleted',
            data: getDeletedBlockFloor[0]
        });
    }
    catch (error) {
        req.log.error(error)
        res.status(500).send(error.message)
    }
}

async function validatePayload(body, isUpdate = false, blockFloorId = null, mysqlClient) {
    const {
        blockId,
        floorNumber,
        isActive
    } = body

    const errors = []
    if (blockId !== undefined) {
        if (isNaN(blockId) || blockId <= 0) {
            errors.push('BlockId is invalid')
        }
    }

    if (floorNumber !== undefined) {
        if (isNaN(floorNumber) || floorNumber <= 0) {
            errors.push('Floor Number is invalid')
        } else {
            let query;
            let params;

            if (isUpdate === true) {
                query = /*sql*/`
                    SELECT 
                        COUNT(*) AS count 
                    FROM 
                        blockFloor 
                    WHERE 
                          blockId = ? AND 
                          floorNumber = ? AND 
                          blockFloorId != ? AND 
                          deletedAt IS NULL`;

                params = [blockId, floorNumber, blockFloorId];
            } else {
                query = /*sql*/`
                    SELECT 
                        COUNT(*) AS count
                    FROM
                        blockFloor 
                    WHERE 
                        blockId = ? AND 
                        floorNumber = ? AND 
                        deletedAt IS NULL`;

                params = [blockId, floorNumber];
            }

            const validFloorNumber = await mysqlQuery(query, params, mysqlClient);
            if (validFloorNumber[0].count > 0) {
                errors.push("Floor Number already exists");
            }
        }
    } else {
        errors.push('Floor Number is missing')
    }

    if (isActive !== undefined) {
        if (![0, 1].includes(isActive)) {
            errors.push('isActive is invalid')
        } else if (isUpdate === true && isActive === 0) {
            const validateStudentInBlockFloor = await mysqlQuery(/*sql*/`
                SELECT 
                    COUNT(*) AS count 
                FROM 
                    student 
                WHERE 
                    blockFloorId = ? AND
                    deletedAt IS NULL`, 
                [blockFloorId], mysqlClient)
            
            if (validateStudentInBlockFloor[0].count > 0) {
                errors.push("Students in blockfloor shift to another blockfloor and then try to inactive.")
            }
        }
    } else {
        errors.push('isActive is missing')
    }
    return errors
}

function getBlockFloorById(blockFloorId, mysqlClient) {
    return new Promise((resolve, reject) => {
        mysqlClient.query(/*sql*/`SELECT COUNT(*) AS count FROM blockfloor WHERE blockfloorId = ?`, 
        [blockFloorId], (err, blockFloor) => {
            if (err) {
                return reject(err)
            }
            resolve(blockFloor[0].count > 0 ? blockFloor[0] : null)
        })
    })
}

async function validateBlockFloorById(blockFloorId, mysqlClient) {
    var blockFloor = await getBlockFloorById(blockFloorId, mysqlClient)
    if (blockFloor !== null) {
        return true
    }
    return false
}

module.exports = (app) => {
    app.get('/api/blockfloor', readBlockFloors)
    app.get('/api/blockfloor/floornumber', readFloorNumberByBlockId)
    app.get('/api/blockfloor/:blockfloorId', readBlockFloorById)
    app.post('/api/blockfloor', createBlockFloor)
    app.put('/api/blockfloor/:blockfloorId', updateBlockFloorById)
    app.delete('/api/blockfloor/:blockfloorId', deleteBlockFloorById)
}
