const { getAppUrl } = require('../../utilityclient/url');

function blockFloorPageUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/blockfloor/blockfloorlist.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        breadCrumbs: [
            {name:'Home', link:getAppUrl('home')},
            {name:'Structure', link:''},
            {name:'Blockfloor', link:''}
        ]
    });
}

function addBlockFloorUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    res.render('pages/blockfloor/blockfloorform.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        blockFloorId: '',
        breadCrumbs: [
            {name:'Home', link:getAppUrl('home')},
            {name:'Structure', link:''},
            {name:'Blockfloor', link:getAppUrl('blockfloor')},
            {name:'Add', link:''}
        ]
    });
}

function editBlockFloorUi(req, res) {
    const avatarWardenId = req.session.warden.wardenId;
    const blockFloorId = req.params.blockFloorId;
    res.render('pages/blockfloor/blockfloorform.ejs', {
        appURL: getAppUrl(),
        avatarWardenId: avatarWardenId,
        blockFloorId: blockFloorId,
        breadCrumbs: [
            {name:'Home', link:getAppUrl('home')},
            {name:'Structure', link:''},
            {name:'Blockfloor', link:getAppUrl('blockfloor')},
            {name:'Edit', link:''}
        ]
    });
}

module.exports = (app) => {
    app.get('/blockfloor', blockFloorPageUi)
    app.get('/blockfloor/add', addBlockFloorUi)
    app.get('/blockfloor/:blockFloorId', editBlockFloorUi)
}
