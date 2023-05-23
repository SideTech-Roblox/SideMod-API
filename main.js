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
      res.status(400).json({ error: `Missing required header: ${headerName}` });
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

app.get("/schedule/get", requireHeader('guild-id'), requireHeader('api-token'), (req, res) => {
  const GuildId = req.headers['guild-id'];
  const Token = req.headers['api-token'];

  get(child(DatabaseDownload, `GuildsDatabase/${GuildId}`)).then((snapshot) => {
    if (snapshot.exists()) {
      get(child(DatabaseDownload, `APIKeyDatabase/${GuildId}`)).then((snapshot2) => {
        if (snapshot2.exists()) {
          if (snapshot2.val() === Token) {
            get(child(DatabaseDownload, `GuildsDatabase/${GuildId}/Schedule`)).then((snapshot3) => {
              if (snapshot3.exists()) {
                let currenttime = Math.floor(Date.now() / 1000);

                const sortedSnapshots = [];

                snapshot3.forEach(function (childSnapshot3) {
                  if (currenttime <= childSnapshot3.child('timestamp').val()) {
                    sortedSnapshots.push(childSnapshot3);
                  }
                });

                if (sortedSnapshots.length === 0) {
                  return res.status(400).json({ error: "There are currently 0 events scheduled!" });
                }

                sortedSnapshots.sort(function (a, b) {
                  return a.child('timestamp').val() - b.child('timestamp').val();
                });

                const list = {};

                sortedSnapshots.forEach(function (snapshot4) {
                  list[snapshot4.key] = {
                    host: snapshot4.child('host').val(),
                    duration: snapshot4.child('duration').val(),
                    notes: snapshot4.child('notes').val(),
                    eventtype: snapshot4.child('eventtype').val(),
                    timestamp: snapshot4.child('timestamp').val(),
                  };
                });

                res.status(200).json(list);
              } else {
                res.status(400).json({ error: "There are currently 0 events scheduled!" });
              };
            });
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
