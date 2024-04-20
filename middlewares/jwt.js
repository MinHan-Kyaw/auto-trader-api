var { expressjwt: jwt } = require("express-jwt");
const secret = process.env.JWT_SECRET;

const authenticate = jwt({
    secret: secret,
    algorithms: ["HS256"], // Specify the algorithm used to sign the token
});

module.exports = authenticate;
