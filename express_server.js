const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = 8080;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// use ejs as templating engine
app.set("view engine", "ejs");

const urlDatabase = {
    b2xVn2: "http://www.lighthouselabs.ca",
    "9sm5xK": "http://www.google.com"
};

const usersDB = {
    randomUID: {
        id: "randomUID",
        email: "user@example.com",
        password: "purple"
    },
    random2UID: {
        id: "randomUID",
        email: "user2@example.com",
        password: "dishwasher-funk"
    }
};

app.get("/", (req, res) => {
    res.end("<html><h1>Welcome To The Link Shortener</h1></html>");
});

app.get("/urls.json", (req, res) => {
    res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
    res.end("<html><body>Hello <b>World</b></body></html>\n");
});

app.get("/urls", (req, res) => {
    const templateVars = {
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    // if the cookie exists set the userInfo to DB[user_id] from cookie
    if (req.cookies["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.cookies["user_id"]];
    }
    res.render("urls_index", templateVars);
});

// renders page for new url to shorten
app.get("/urls/new", (req, res) => {
    const templateVars = {
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    if (req.cookies["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.cookies["user_id"]];
    }
    if (templateVars["userInfo"] === undefined) {
        res.render("urls_login", templateVars);
    } else {
        res.render("urls_new", templateVars);
    }
});

app.get("/urls/:id", (req, res) => {
    const templateVars = {
        shortURL: req.params.id,
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    if (req.cookies["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.cookies["user_id"]];
    }
    res.render("urls_show", templateVars);
});

// waits for a post to /urls and redirects them to the
// page where they can look at the short and long url
app.post("/urls", (req, res) => {
    // Checks if an empty string was entered
    var errors = [];
    if (req.body["longURL"] === "") {
        errors.push("INVALID URL");
    }
    if (errors.length > 0) {
        const templateVars = {
            shortURL: req.params.id,
            urls: urlDatabase,
            userInfo: undefined,
            errors: errors
        };
        if (req.cookies["user_id"] !== undefined) {
            templateVars["userInfo"] = usersDB[req.cookies["user_id"]];
        }
        res.render("urls_new", templateVars);
    } else {
        // generates a random 6 alpha numeric string
        var shortURL = generateRandomString();

        // adds the long url to database
        urlDatabase[shortURL] = req.body["longURL"];
        res.redirect(`/urls/${shortURL}`);
    }
});

app.post("/urls/:id/delete", (req, res) => {
    const shortURL = req.params["id"];

    delete urlDatabase[shortURL];
    res.redirect(`/urls`);
});

// waits for a post to /urls/:id then updates the link inside
app.post("/urls/:id", (req, res) => {
    const shortURL = req.params["id"];
    const updatedLongURL = req.body["editLongURL"];
    urlDatabase[shortURL] = updatedLongURL;
    res.redirect("/urls");
});

// redirects the user to whatever the shortURL is in the database
app.get("/u/:shortURL", (req, res) => {
    // got the short url from the id
    const shortURL = req.params["shortURL"];
    if (!(shortURL in urlDatabase)) {
        console.log("shortURL doesn't exist. Redirecting to homepage");
        res.redirect("/");
    } else {
        // find the long URL in the database
        const longURL = urlDatabase[shortURL];
        // response redirect to the long url
        res.redirect(longURL);
    }
});

// route to login
app.post("/login", (req, res) => {
    // check if valid login
    let validEmail = false;
    let validPassword = false;
    const DBValues = Object.values(usersDB);

    DBValues.forEach(element => {
        if (req.body["email"] === element["email"]) {
            console.log("found email, now check password");
            validEmail = true;
            if (req.body["password"] === element["password"]) {
                console.log("match! logged in");
                validPassword = true;
                res.cookie("user_id", element["id"]);
                res.redirect("/urls");
            }
        }
    });
    if (validEmail === true && validPassword === false) {
        console.log("Wrong Password");
        res.status(403).send("Wrong Password");
    } else if (validEmail === false && validPassword === false) {
        console.log("Wrong Username");
        res.status(403).send("Wrong Username");
    }
});

app.get("/login", (req, res) => {
    const templateVars = {
        shortURL: req.params.id,
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    if (req.cookies["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.cookies["user_id"]];
    }
    res.render("urls_login", templateVars);
});
// route to logout
app.post("/logout", (req, res) => {
    res.clearCookie("user_id");
    res.redirect("/urls");
});

// route to register
app.get("/register", (req, res) => {
    const templateVars = {
        shortURL: req.params.id,
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    if (req.cookies["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.cookies["user_id"]];
    }
    res.render("urls_register", templateVars);
});

app.post("/register", (req, res) => {
    // if email or password are empty, send back response with 400
    if (req.body["email"] === "" || req.body["password"] === "") {
        console.log("empty email/pass");

        res.status(400).send("Error No Email");
    }

    // check if email already in DB
    const DBValues = Object.values(usersDB);
    DBValues.forEach(element => {
        if (req.body["email"] === element["email"]) {
            res.status(400).send("Error Email Already Exists");
        }
    });

    const newUser = {};
    // gets the info for the object
    const id = generateRandomString();
    const email = req.body["email"];
    const password = req.body["password"];
    // put the info into an object
    newUser["id"] = id;
    newUser["email"] = email;
    newUser["password"] = password;
    // adds into the newUser usersDB
    usersDB[id] = newUser;
    // sets the cookie to userid cookie
    res.cookie("user_id", id);
    res.redirect("/urls");
});

app.listen(PORT, function() {
    console.log(`Example app is listening on port ${PORT}`);
});

function generateRandomString() {
    var result = "";
    var charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    for (let i = 0; i < 6; i++) {
        result += charset[Math.floor(Math.random() * charset.length)];
    }
    return result;
}
