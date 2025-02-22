const { getAppUrl } = require('../../utilityclient/url');


function roomPageUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/room/roomlist.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        breadCrumbs : [ 
            {name:'Home', link:getAppUrl('home')},
            {name:'Structure', link:''},
            {name:'Room', link:''}
        ]
    });
}

function addRoomUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/room/roomform.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        roomId: '',
        breadCrumbs : [ 
            {name:'Home', link:getAppUrl('home')},
            {name:'Structure', link:'#tables-nav'},
            {name:'Room', link:getAppUrl('room')},
            {name:'Add', link:''}
        ]

    });
}

function editRoomUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    const roomId = req.params.roomId;
    res.render('pages/room/roomform.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        roomId: roomId,
        breadCrumbs : [ 
            {name:'Home', link:getAppUrl('home')},
            {name:'Structure', link:'#tables-nav'},
            {name:'Room', link:getAppUrl('room')},
            {name:'Edit', link:''}
        ]
    });
}

module.exports = (app) => {
    app.get('/room', roomPageUi)
    app.get('/room/add', addRoomUi)
    app.get('/room/:roomId', editRoomUi)
}
