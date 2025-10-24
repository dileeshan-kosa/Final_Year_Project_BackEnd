const express = require("express");
const manageVoterDetails = require("../controller/manageVoterDetails");
const manageCandidateDetails = require("../controller/manageCandidateDetails");

const router = express.Router();

//admin create
const adminSignUpController = require("../controller/adminSignUp");
const adminSignInController = require("../controller/adminSignIn");
const authToken = require("../middleware/authToken");
const adminDetailsController = require("../controller/adminDetails");
const adminLogout = require("../controller/adminLogout");

router.post("/signup", adminSignUpController);
router.post("/signin", adminSignInController);

//voter signIn and signOut
const voterSignInController = require("../controller/voterSignIn");
const voteControlWithBlockchain = require("../controller/voteControlWithBlockchain");
const { publicKeyPem } = require("../utils/rsaKeys");
const ReAwsVotes = require("../controller/awsVotesRecover");

router.post("/signupvoter", voterSignInController);

//Send public key to frontend
router.get("/public-key", (req, res) => {
  res.json({ publicKey: publicKeyPem });
});

//get admin details
router.get("/admin-details", authToken, adminDetailsController);

//log out admin
router.get("/adminLogout", adminLogout);

router.get("/capture-fingerprint", manageVoterDetails.getVoders);

//new api call Manage Voters
router.post("/manage-voters", manageVoterDetails.createVoterDetails);

// router.post("/get-votersdetails/:id", manageVoterDetails.getIdVoter);

// router.get("/get-managemodule", manageModuleCtrl.getModules);
router.get("/get-voterdetails", manageVoterDetails.getVoders);
router.get("/get-idvoters", manageVoterDetails.getVotersID);

// Get full details on voters.
router.get("/getsfulldetails-voters", manageVoterDetails.getallVoterdetails);

// new api call vote add to the blockchain
router.post("/sendVote", voteControlWithBlockchain.createBlockchainDetails);
//new api call get vote in to the blockchain
router.get("/getVotes", voteControlWithBlockchain.getVotesDetails);

//new api call manage Candidates
router.post("/add-candidates", manageCandidateDetails.createCandidateDetaila);
router.get("/get-candidates", manageCandidateDetails.getCandidates);

// new api call get election vote count (block-chaine votes)
router.get("/get-blockchainVotes", voteControlWithBlockchain.getVotesDetails);

//new api call get backup election votes AWS S3 bucket
router.get("/get-awsBackupVotes", ReAwsVotes.recoverAwsVotes);

module.exports = router;
