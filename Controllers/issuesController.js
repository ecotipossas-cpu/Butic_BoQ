const axios = require('axios');
const Issue = require('../models/Issue')

const getIssues = async (req, res, next) => {
  try {
    console.log('session: ', req.session);
    const { containerId } = req.params;

    // 1. Limpia el prefijo 'b.' si viene incluido en el containerId/projectId
    const cleanProjectId = containerId.replace(/^b\./, '');

    // 2. Endpoint actualizado para la API de ACC (Construction Issues v1)
    const url = `https://developer.api.autodesk.com/construction/issues/v1/projects/${cleanProjectId}/issues`;

    const resp = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${req.session.internal_token}`,
      },
    });

    res.status(200).json(resp.data);
  } catch (error) {
    next(error);
  }
};

const getIssuesByDbidFromMongo = async (req, res, next) => {
  try {
    const { dbid } = req.params
    const issues = await Issue.find({ dbIds: { $in: dbid } })
    res.status(200).json({ status: 'success', number: issues.length, data: issues })
  } catch (err) {
    next(err)
  }
}


module.exports = {
  getIssues,
  getIssuesByDbidFromMongo,
};