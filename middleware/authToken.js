const jwt = require("jsonwebtoken");

async function authToken(req, res, next) {
  try {
    const token = req.cookies?.token;

    console.log("token", token);
    if (!token) {
      return res.status(200).json({
        message: "Admin not Loging!",
        error: true,
        success: false,
      });
    }

    jwt.verify(token, process.env.TOKEN_SECRET_KEY, function (err, decoded) {
      console.log(err);
      console.log("decoded", decoded);

      if (err) {
        console.log("error auth", err);
      }

      req.adminId = decoded?._id;

      next();
    });
    // 3.22

    // console.log("token.............", token);
  } catch (err) {
    res.status(400).json({
      message: err.message || err,
      // DataTransfer: [],
      data: [],
      error: true,
      success: false,
    });
  }
}

module.exports = authToken;
