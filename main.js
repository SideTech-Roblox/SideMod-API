const express = require("express");
const rbx = require("noblox.js");
const app = express();
const randomstring = require("randomstring");
const { initializeApp } = require("firebase/app");
const {
  getDatabase,
  ref,
  set,
  child,
  get,
  remove,
  update,
  increment,
} = require("firebase/database");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

app.use(express.static("public"));

const firebaseConfig = {
  apiKey: process.env.firebaseApiKey,
  authDomain: process.env.firebaseAuthDomain,
  databaseURL: process.env.firebaseDatabaseURL,
  projectId: process.env.firebaseProjectId,
  storageBucket: process.env.firebaseStorageBucket,
  messagingSenderId: process.env.firebaseMessagingSenderId,
  appId: process.env.firebaseAppId,
  measurementId: process.env.firebaseMeasurementId,
};

initializeApp(firebaseConfig);

const auth = getAuth();
signInWithEmailAndPassword(
  auth,
  process.env.firebaseAuthEmail,
  process.env.firebaseAuthPassword
)
  .then((userCredential) => {
    const user = userCredential.user;
    console.log("::: Firebase ::: Sign in, success!");
  })
  .catch((error) => {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.log(
      `::: Firebase ::: Sign in, failed! ${errorMessage} | ${errorCode}`
    );
  });

const DatabaseDownload = ref(getDatabase());

function isNumeric(str) {
  if (typeof str != "string") return false;
  return !isNaN(str) && !isNaN(parseFloat(str));
}

const requireHeader = (headerName) => {
  return (req, res, next) => {
    if (req.headers[headerName]) {
      next();
    } else {
      res.status(400).send(`Missing required header: ${headerName}`);
    }
  };
};

app.get("/notes/get", requireHeader('guild-id'), requireHeader('api-token'), (req, res) => {
  const GuildId = req.headers['guild-id'];
  const Token = req.headers['api-token'];

  const UserId = req.query.userid;
  
  if (UserId) {
     get(child(DatabaseDownload, `GuildsDatabase/${GuildId}`)).then((snapshot) => {
       if (snapshot.exists()) {
         get(child(DatabaseDownload, `APIKeyDatabase/${GuildId}`)).then((snapshot2) => {
           if (snapshot2.exists()) {
             if (snapshot2.val() === Token) {
               if (snapshot.child('UserData').exists()) {
                 if (snapshot.child('UserData').child(UserId).exists()) {
                    if (snapshot.child('UserData').child(UserId).child('Notes').exists()) {
                      const data = {
                        RobloxId: UserId,
                        Notes: snapshot.child('UserData').child(UserId).child('Notes').val()
                      };
                      res.status(200).json(data);
                    } else {
                      const data = {
                        RobloxId: UserId,
                        Notes: 'None'
                      };
                      res.status(200).json(data);
                    };
                 } else {
                   const data = {
                     RobloxId: UserId,
                     Notes: 'None'
                   };
                   res.status(200).json(data);
                 };
               } else {
                 const data = {
                   RobloxId: UserId,
                   Notes: 'None'
                 };
                 res.status(200).json(data);
               };
             } else {
               res.status(400).json({ error: "Invalid API Token!" });
             }; 
           } else {
             res.status(400).json({ error: "Invalid API Token!" });
           };
         });
       } else {
          res.status(400).json({ error: "Invalid GuildId!" });
       };
     });
  } else {
   res.status(400).json({ error: "Invalid User!" });
  }
});

app.get("/points/get", requireHeader('guild-id'), requireHeader('api-token'), (req, res) => {
  const GuildId = req.headers['guild-id'];
  const Token = req.headers['api-token'];

  const UserId = req.query.userid;
  
  if (UserId) {
     get(child(DatabaseDownload, `GuildsDatabase/${GuildId}`)).then((snapshot) => {
       if (snapshot.exists()) {
         get(child(DatabaseDownload, `APIKeyDatabase/${GuildId}`)).then((snapshot2) => {
           if (snapshot2.exists()) {
             if (snapshot2.val() === Token) {
               if (snapshot.child('UserData').exists()) {
                 if (snapshot.child('UserData').child(UserId).exists()) {
                    if (snapshot.child('UserData').child(UserId).child('Points').exists()) {
                      const data = {
                        RobloxId: UserId,
                        Points: snapshot.child('UserData').child(UserId).child('Points').val()
                      };
                      res.status(200).json(data);
                    } else {
                      const data = {
                        RobloxId: UserId,
                        Points: 0
                      };
                      res.status(200).json(data);
                    };
                 } else {
                   const data = {
                     RobloxId: UserId,
                     Points: 0
                   };
                   res.status(200).json(data);
                 };
               } else {
                 const data = {
                   RobloxId: UserId,
                   Points: 0
                 };
                 res.status(200).json(data);
               };
             } else {
               res.status(400).json({ error: "Invalid API Token!" });
             }; 
           } else {
             res.status(400).json({ error: "Invalid API Token!" });
           };
         });
       } else {
          res.status(400).json({ error: "Invalid GuildId!" });
       };
     });
  } else {
   res.status(400).json({ error: "Invalid User!" });
  }
});

app.post("/pointslog/new", requireHeader('guild-id'), requireHeader('api-token'), (req, res) => {
  const GuildId = req.headers['guild-id'];
  const Token = req.headers['api-token'];
  const Log = req.body;
  
  if (Log) {
    get(child(DatabaseDownload, `GuildsDatabase/${GuildId}`)).then((snapshot) => {
      if (snapshot.exists()) {
        get(child(DatabaseDownload, `APIKeyDatabase/${GuildId}`)).then((snapshot2) => {
          if (snapshot2.exists()) {
            if (snapshot2.val() === Token) {
              const JSONLog = JSON.parse(Log);
              const key = randomstring.generate(20);
              
              JSONLog.array.forEach(function (item, index) {
                const db = getDatabase();
                update(ref(db, `GuildsDatabase/${GuildId}/PointsLogs/${key}`), {
                  [item]: index
                });
              });

              res.status(200).json({ success: "Log entry added successfully!" });
            } else {
              res.status(400).json({ error: "Invalid API Token!" });
            }
          } else {
            res.status(400).json({ error: "Invalid API Token!" });
          }
        });
      } else {
        res.status(400).json({ error: "Invalid GuildId!" });
      }
    });
  } else {
    res.status(400).json({ error: "Invalid Log!" });
  }
});

app.get("/verify/get", (req, res) => {
  const userID = req.query.userid;
  
  if (userID) {
    get(child(DatabaseDownload, `VerifyDatabase/${userID}`)).then((snapshot) => {
      if (snapshot.exists()) {
        const data = {
          RobloxId: snapshot.val(),
          DiscordId: snapshot.key
        };
        res.status(200).json(data);
      } else {
        res.status(400).json({ error: "User is not verified!" });
      }
    });
  } else {
    res.status(400).json({ error: "Invalid User!" });
  }
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
