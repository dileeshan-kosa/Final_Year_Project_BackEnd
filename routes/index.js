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
const createElectionCtrl = require("../controller/createElectionCtrl");
const voterMongodbClean = require("../controller/voterDetails");

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

// new api call hasVoted column updated
router.post("/updated-hasVoted", voterMongodbClean.getNicCleanMongodb);

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

//new api call create election
router.post("/create-election", createElectionCtrl.createElection);

//new api call get election details
router.get("/get-electionstatus", createElectionCtrl.getLatestElection);

// CronJob triggering function
if (typeof createElectionCtrl.resumeSchedulerOnStartup === "function") {
  // call but don't await blocking the require; log errors if any
  createElectionCtrl
    .resumeSchedulerOnStartup()
    .catch((err) =>
      console.error("Error resuming scheduler from routes import:", err)
    );
}

module.exports = router;
