var { expressjwt: jwt } = require("express-jwt");
const secret = process.env.JWT_SECRET;

const authenticate = jwt({
  secret: secret,
  algorithms: ["HS256"], // Specify the algorithm used to sign the token
});

// module.exports = authenticate;
module.exports = function (req, res, next) {
  authenticate(req, res, function (err) {
    if (err) {
      console.error("JWT Error:", err.message);
      return res.status(401).json({ message: "Unauthorized" });
    } else {
      if (!req.auth) {
        return apiResponse.ErrorResponse(
          res,
          { message: "Token expired" },
          401
        );
      }
    }
    next();
  });
};
