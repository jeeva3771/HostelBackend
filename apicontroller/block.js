const { mysqlQuery } = require('../utilityclient/query');
const ALLOWED_UPDATE_KEYS = [
    "blockCode",
    "blockLocation",
    "isActive"
];

async function readBlocks(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const page = req.query.page ? parseInt(req.query.page) : null;
    const offset = limit && page ? (page - 1) * limit : null;
    const orderBy = req.query.orderby || 'bk.blockCode';
    const sort = req.query.sort || 'ASC';
    const searchQuery = req.query.search || '';
    const searchPattern = `%${searchQuery}%`;
    let queryParameters = null;

    let blocksQuery = /*sql*/`
        SELECT 
            bk.*,
            w.firstName AS createdFirstName,
            w.lastName AS createdLastName,
            DATE_FORMAT(bk.createdAt, "%y-%b-%D %r") AS createdTimeStamp,
            (SELECT COUNT(*) FROM blockfloor b WHERE b.blockId = bk.blockId AND b.deletedAt IS NULL)
            AS floorCount 
            FROM block AS bk
        LEFT JOIN 
            warden AS w ON w.wardenId = bk.createdBy
        WHERE 
            bk.deletedAt IS NULL AND 
            (bk.blockCode LIKE ? OR 
            bk.blockLocation LIKE ? OR
            w.firstName LIKE ? OR 
            w.lastName LIKE ? OR 
            bk.isActive LIKE ?)
        ORDER BY ${orderBy} ${sort}`

    let countQuery = /*sql*/ `
        SELECT COUNT(*) AS totalBlockCount 
        FROM block AS bk
        LEFT JOIN warden AS w ON w.wardenId = bk.createdBy
        WHERE bk.deletedAt IS NULL AND
        (bk.blockCode LIKE ? OR 
        bk.blockLocation LIKE ? OR
        w.firstName LIKE ? OR 
        w.lastName LIKE ? OR 
        bk.isActive LIKE ?)
        ORDER BY ${orderBy} ${sort}`;
        
        if (limit >= 0) {
            blocksQuery += ' LIMIT ? OFFSET ?';
            queryParameters = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern, limit, offset];
        } else {
            queryParameters = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];
        }

        const countQueryParameters = [searchPattern, searchPattern, searchPattern, searchPattern, searchPattern];

    try {
        const [blocks, totalCount] = await Promise.all([
            mysqlQuery(blocksQuery, queryParameters, mysqlClient),
            mysqlQuery(countQuery, countQueryParameters, mysqlClient)
        ]);

        res.status(200).send({
            blocks: blocks,
            blockCount: totalCount[0].totalBlockCount
        });

    } catch (error) {
        console.log(error)
        req.log.error(error); 
        res.status(500).send(error.message)
    }
}

async function readBlockById(req, res) {
    const mysqlClient = req.app.mysqlClient;
    const blockId = req.params.blockId;
    try {
        const block = await mysqlQuery(/*sql*/`
             SELECT 
                bk.*,
                w.firstName AS createdFirstName,
                w.lastName AS createdLastName,
                w2.firstName AS updatedFirstName,
                w2.lastName AS updatedLastName,
                DATE_FORMAT(bk.createdAt, "%y-%b-%D %r") AS createdTimeStamp,
                DATE_FORMAT(bk.updatedAt, "%y-%b-%D %r") AS updatedTimeStamp
                FROM block AS bk
            LEFT JOIN 
                warden AS w ON w.wardenId = bk.createdBy
            LEFT JOIN 
                warden AS w2 ON w2.wardenId = bk.updatedBy
            WHERE 
                bk.deletedAt IS NULL AND blockId = ?`,
            [blockId],
            mysqlClient
        )
        if (block.length === 0) {
            return res.status(404).send("blockId not valid");
        }
        res.status(200).send(block[0])
    } catch (error) {
        req.log.error(error);
        res.status(500).send(error.message)
    }
}

async function readBlockFloorBlockCodeCount(req, res) { 
    logger.info('hii')
    const mysqlClient = req.app.mysqlClient;
    const blockId = req.query.blockId;
    try {
        let query = /*sql*/`
            SELECT 
                blockId, 
                blockCode,
                (SELECT COUNT(*) FROM blockfloor b
                WHERE b.blockId = bk.blockId 
                AND b.deletedAt IS NULL) AS floorCount 
            FROM block bk 
            WHERE 
                bk.isActive = 1 AND 
                bk.deletedAt IS NULL 
            ORDER BY bk.blockCode ASC`;

        const queryParams = [];
        if (blockId) {
            query += ` AND blockId = ?`;
            queryParams.push(blockId);
        }

        const blockFloorBlockCodeCount = await mysqlQuery(query, queryParams, mysqlClient);

        if (blockFloorBlockCodeCount.length === 0) {
            return res.status(404).send('No block code found');
        }

        res.status(200).send(blockFloorBlockCodeCount);
    } catch (error) {
        req.log.error(error);
        res.status(500).send(error.message)
    }
}

async function readBlockAttendancePercentage(req, res) {
    const mysqlClient = req.app.mysqlClient
    const blockId = req.query.blockId
    try {
        const blockCount = await mysqlQuery(/*sql*/`SELECT COUNT(*) AS count FROM student WHERE blockId = ?`,
            [blockId], mysqlClient)

        if (blockCount.length === 0) {
            return res.status(404).send('No student in block')
        }

        const checkInDateCount = await mysqlQuery(/*sql*/`SELECT COUNT(*) AS count FROM attendance WHERE 
        blockId = ? AND checkInDate = DATE(NOW())`, [blockId], mysqlClient)

        var calculationPercentage = blockCount[0].count / checkInDateCount[0].count * 100

        res.status(200).send(calculationPercentage)
    } catch (error) {
        req.log.error(error);
        res.status(500).send(error.message)
    }
}

async function createBlock(req, res) {
    const mysqlClient = req.app.mysqlClient;

    const {
        blockCode,
        blockLocation,
        isActive
    } = req.body
    const createdBy = req.session.warden.wardenId;
    
    try {
        const isValidInsert = await validatePayload(req.body, false, null, mysqlClient);
        if (isValidInsert.length > 0) {
            return res.status(400).send(isValidInsert)
        }

        const newBlock = await mysqlQuery(/*sql*/`INSERT INTO BLOCK(blockCode, blockLocation, isActive, createdBy) VALUES(?,?,?,?)`,
            [blockCode, blockLocation, isActive, createdBy], mysqlClient)

        if (newBlock.affectedRows === 0) {
            res.status(400).send({error:"No insert was made"})
        } else {
            res.status(201).send('Insert successfully')
        }
    } catch (error) {
        req.log.error(error);
        res.status(500).send(error.message)
    }
}

async function updateBlockById(req, res) {
    const blockId = req.params.blockId;
    const updatedBy = req.session.warden.wardenId;
    const values = []
    const updates = []

    ALLOWED_UPDATE_KEYS.forEach((key) => {
        const keyValue = req.body[key]
        if (keyValue !== undefined) {
            values.push(keyValue)
            updates.push(` ${key} = ? `)
        }
    })

    updates.push("updatedBy = ?")
    values.push(updatedBy, blockId)
    const mysqlClient = req.app.mysqlClient

    try {
        const block = await validateBlockById(blockId, mysqlClient);
        if (!block) {
            return res.status(404).send({error:"Block not found or already deleted"});
        }

        const isValidInsert = await validatePayload(req.body, true, blockId, mysqlClient);
        if (isValidInsert.length > 0) {
            return res.status(400).send(isValidInsert)
        }

        const isUpdate = await mysqlQuery(/*sql*/`UPDATE block SET  ${updates.join(', ')} WHERE blockId = ? 
            AND deletedAt IS NULL`, values, mysqlClient
        )
        if (isUpdate.affectedRows === 0) {
            res.status(204).send({error:"No changes made"})
        }

        const getUpdatedBlock = await mysqlQuery(/*sql*/`SELECT * FROM block WHERE blockId = ? `,
            [blockId], mysqlClient)
        res.status(200).send({
            status: 'successfull',
            data: getUpdatedBlock[0]
        })
    }
    catch (error) {
        req.log.error(error);
        res.status(500).send(error.message)
    }
}

async function deleteBlockById(req, res) {
    const blockId = req.params.blockId;
    const mysqlClient = req.app.mysqlClient;
    const deletedBy = req.session.warden.wardenId;

    try {
        const isValid = await validateBlockById(blockId, mysqlClient)
        if (!isValid) {
            return res.status(404).send("BlockId is not defined")
        }

        const [checkStudentInBlock] = await mysqlQuery(/*sql*/`
            SELECT COUNT(*) AS count FROM student 
            WHERE blockId = ? 
            AND deletedAt IS NULL`,
            [blockId]
        , mysqlClient )


        if (checkStudentInBlock.count > 0) {
            return res.status(409).send('Students in a block shift to another block and then try to delete.')
        }

        const [checkFloorInBlock] = await mysqlQuery(/*sql*/`
            SELECT COUNT(*) AS count FROM blockfloor
            WHERE blockId = ? 
            AND deletedAt IS NULL`, 
            [blockId]
        , mysqlClient)

        if (checkFloorInBlock.count > 0) {
            return res.status(409).send('Block is referenced by a floor and cannot be deleted.')
        }

        const deletedBlock = await mysqlQuery(/*sql*/`
            UPDATE block SET 
                blockCode = CONCAT(IFNULL(blockCode, ''), '-', NOW()), 
                deletedAt = NOW(), 
                deletedBy = ? 
            WHERE blockId = ? 
            AND deletedAt IS NULL`,
            [deletedBy, blockId]
        , mysqlClient)
        
        if (deletedBlock.affectedRows === 0) {
            return res.status(404).send("Block not found or already deleted")
        }

        const getDeletedBlock = await mysqlQuery(/*sql*/`SELECT * FROM block WHERE blockId = ? `,
                                [blockId], mysqlClient)

        res.status(200).send({
            status: 'deleted',
            data: getDeletedBlock[0]
        });
    }
    catch (error) {
        req.log.error(error);
        res.status(500).send(error.message)
    }
}

function getBlockById(blockId, mysqlClient) {
    return new Promise((resolve, reject) => {
        mysqlClient.query(/*sql*/`SELECT COUNT(*) AS count FROM block WHERE blockId = ? AND deletedAt IS NULL`, 
            [blockId], (err, block) => {
            if (err) {
                return reject(err)
            }
            resolve(block[0].count > 0 ? block[0] : null)

        })
    })
}

async function validateBlockById(blockId, mysqlClient) {
    var block = await getBlockById(blockId, mysqlClient)
    if (block !== null) {
        return true
    }
    return false
}

async function validatePayload(body, isUpdate = false, blockId = null, mysqlClient) {
    const { blockCode, blockLocation, isActive } = body;
    const errors = [];

    if (blockCode !== undefined) {
        if (blockCode.length < 1) {
            errors.push("Block Code is invalid");
        } else {
            let query;
            let params;

            if (isUpdate === true) {
                query = /*sql*/`
                    SELECT 
                        COUNT(*) AS count
                    FROM 
                        block 
                    WHERE blockCode = ? AND 
                          blockId != ? AND 
                          deletedAt IS NULL`;

                params = [blockCode, blockId];
            } else {
                query = /*sql*/`
                    SELECT 
                        COUNT(*) AS count 
                    FROM 
                        block
                    WHERE 
                        blockCode = ? AND
                        deletedAt IS NULL`;

                params = [blockCode];
            }

            const validBlockCode = await mysqlQuery(query, params, mysqlClient);
            if (validBlockCode[0].count > 0) {
                errors.push("Block Code already exists");
            }
        }
    } else {
        errors.push("Block Code is missing");
    }

    if (blockLocation !== undefined) {
        if (blockLocation.length < 1) {
            errors.push("Location is invalid")
        }
    } else {
        errors.push("Location is missing")
    }

    if (isActive !== undefined) {
        if (![0, 1].includes(isActive)) {
            errors.push("isActive is invalid")
        } else if (isUpdate === true && isActive === 0) {
            const validateStudentInBlock = await mysqlQuery(/*sql*/`
                SELECT 
                    COUNT(*) AS count
                FROM 
                    student 
                WHERE 
                    blockId = ? AND 
                    deletedAt IS NULL`,
                [blockId], mysqlClient)
            
            if (validateStudentInBlock[0].count > 0) {
                errors.push("Students in block shift to another block and then try to inactive.")
            }
        }
    } else {
        errors.push("isActive is missing")
    }
    return errors
}

module.exports = (app) => {
    app.get('/api/block', readBlocks)
    app.get('/api/block/blockattendancepercentage', readBlockAttendancePercentage)
    app.get('/api/block/:blockId', readBlockById)
    app.get('/api/block/blockfloor/blockcodecount', readBlockFloorBlockCodeCount)
    app.post('/api/block', createBlock)
    app.put('/api/block/:blockId', updateBlockById)
    app.delete('/api/block/:blockId', deleteBlockById)
}
