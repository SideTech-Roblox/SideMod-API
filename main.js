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
app.use(express.json());

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
    console.log(`::: Firebase ::: Sign in, failed! ${errorMessage} | ${errorCode}`);
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

app.get("/data/get", requireHeader('guild-id'), requireHeader('api-token'), (req, res) => {
  const GuildId = req.headers['guild-id'];
  const Token = req.headers['api-token'];
  const UserId = req.query.userid;

  if (!UserId) {
    return res.status(400).json({ error: "Invalid User!" });
  }

  get(child(DatabaseDownload, `GuildsDatabase/${GuildId}`))
    .then((snapshot) => {
      if (!snapshot.exists()) {
        return res.status(400).json({ error: "Invalid GuildId!" });
      }

      return get(child(DatabaseDownload, `APIKeyDatabase/${GuildId}`))
        .then((snapshot2) => {
          if (!snapshot2.exists() || snapshot2.val() !== Token) {
            return res.status(400).json({ error: "Invalid API Token!" });
          }

          const userDataRef = snapshot.child('UserData').child(UserId);
          const points = userDataRef.child('Points').exists() ? userDataRef.child('Points').val() : 0;
          const notes = userDataRef.child('Notes').exists() ? userDataRef.child('Notes').val() : 'None';

          const data = {
            RobloxId: UserId,
            Points: points,
            Notes: notes
          };

          return res.status(200).json(data);
        });
    })
    .catch(() => {
      return res.status(500).json({ error: "Internal Server Error" });
    });
});

app.post("/data/log", requireHeader('guild-id'), requireHeader('api-token'), async (req, res) => {
  try {
    const GuildId = req.headers['guild-id'];
    const Token = req.headers['api-token'];
    const Body = req.body;
    let Notes = req.query.notes || "None";
    let Host = req.query.host || "Server";
    const randomToken = randomstring.generate(20);
    const databasesave = getDatabase();

    if (!Body || !Array.isArray(Body)) {
      return res.status(400).json({ error: "Invalid Body! Body must be an array with user IDs and points." });
    }

    const data = Body.map(([userId, points]) => ({
      userId: Number(userId),
      points: Number(points)
    }));

    if (data.length === 0) {
      return res.status(400).json({ error: "Invalid Body! Body must contain at least one user ID and points pair." });
    }

    const snapshot = await get(child(DatabaseDownload, `GuildsDatabase/${GuildId}`));
    if (!snapshot.exists()) {
      return res.status(400).json({ error: "Invalid GuildId!" });
    }

    const snapshot2 = await get(child(DatabaseDownload, `APIKeyDatabase/${GuildId}`));
    if (!snapshot2.exists() || snapshot2.val() !== Token) {
      return res.status(400).json({ error: "Invalid API Token!" });
    }
    
    update(ref(databasesave, `GuildsDatabase/${GuildId}/PendingData/${randomToken}`), {
      Notes: Notes,
      Host: Host,
		});

    for (const { userId, points } of data) {
      if (typeof userId !== 'number' || typeof points !== 'number') {
        return res.status(400).json({ error: "Invalid user ID or points! Both must be numbers." });
      }
      
      update(ref(databasesave, `GuildsDatabase/${GuildId}/PendingData/${randomToken}/Data`), {
        [userId]: points,
		  });
    }

    return res.status(200).json("Log added successfully!");
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/schedule/get", requireHeader('guild-id'), requireHeader('api-token'), async (req, res) => {
  const GuildId = req.headers['guild-id'];
  const Token = req.headers['api-token'];

  try {
    const guildSnapshot = await get(child(DatabaseDownload, `GuildsDatabase/${GuildId}`));
    if (!guildSnapshot.exists()) {
      return res.status(400).json({ error: "Invalid GuildId!" });
    }

    const apiKeySnapshot = await get(child(DatabaseDownload, `APIKeyDatabase/${GuildId}`));
    if (!apiKeySnapshot.exists() || apiKeySnapshot.val() !== Token) {
      return res.status(400).json({ error: "Invalid API Token!" });
    }

    const scheduleSnapshot = await get(child(DatabaseDownload, `GuildsDatabase/${GuildId}/Schedule`));
    if (!scheduleSnapshot.exists()) {
      return res.status(400).json({ error: "There are currently 0 events scheduled!" });
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const sortedSnapshots = [];

    scheduleSnapshot.forEach((childSnapshot) => {
      if (currentTimestamp <= childSnapshot.child('timestamp').val()) {
        sortedSnapshots.push(childSnapshot);
      }
    });

    if (sortedSnapshots.length === 0) {
      return res.status(400).json({ error: "There are currently 0 events scheduled!" });
    }

    sortedSnapshots.sort((a, b) => {
      return a.child('timestamp').val() - b.child('timestamp').val();
    });

    const list = {};

    sortedSnapshots.forEach((snapshot) => {
      list[snapshot.key] = {
        host: snapshot.child('host').val(),
        duration: snapshot.child('duration').val(),
        notes: snapshot.child('notes').val(),
        eventtype: snapshot.child('eventtype').val(),
        timestamp: snapshot.child('timestamp').val(),
      };
    });

    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/verify/get", async (req, res) => {
  const userID = req.query.userid;

  try {
    if (!userID) {
      return res.status(400).json({ error: "Invalid User!" });
    }

    const snapshot = await get(child(DatabaseDownload, `VerifyDatabase/${userID}`));

    if (snapshot.exists()) {
      const data = {
        RobloxId: snapshot.val(),
        DiscordId: snapshot.key
      };
      return res.status(200).json(data);
    } else {
      return res.status(400).json({ error: "User is not verified!" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
