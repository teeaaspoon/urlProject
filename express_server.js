const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require("bcrypt");
const methodOverride = require("method-override");

const app = express();
const PORT = 8080;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.use(
    cookieSession({
        name: "session",
        keys: ["user_id", "visitor_id"]
    })
);

// use ejs as templating engine
app.set("view engine", "ejs");

const urlDatabase = {
    b2xVn2: {
        longURL: "http://www.lighthouselabs.ca",
        visits: [
            ["someTime", "someVisitorID"],
            ["someOtherTime", "someOtherVisitorID"],
            ["someNextTime", "someVisitorID"]
        ]
    },
    "9sm5xK": {
        longURL: "http://www.google.com",
        visits: [["someTime", "someVisitorID"]]
    },
    traNcE: {
        longURL: "https://soundcloud.com/bryankearney",
        visits: [["someTime", "someVisitorID"]]
    }
};

const usersDB = {
    randomUID: {
        id: "randomUID",
        email: "user@example.com",
        password: bcrypt.hashSync("purple", 10),
        links: ["b2xVn2", "traNcE"]
    },
    random2UID: {
        id: "random2UID",
        email: "user2@example.com",
        password: bcrypt.hashSync("dishwasher-funk", 10),
        links: ["9sm5xK"]
    }
};

app.get("/", (req, res) => {
    if (!req.session["user_id"]) {
        res.redirect("/login");
    } else {
        res.redirect("/urls");
    }
});

app.get("/urls", (req, res) => {
    const templateVars = {
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    // if the cookie exists set the userInfo to DB[user_id] from cookie
    if (req.session["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.session["user_id"]];
        res.render("urls_index", templateVars);
    } else if (req.session["user_id"] === undefined) {
        templateVars["errors"].push("Please Login to Shorten Links");
        res.render("urls_index", templateVars);
    }
});

// renders page for new url to shorten
app.get("/urls/new", (req, res) => {
    const templateVars = {
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    if (req.session["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.session["user_id"]];
    }
    // only logged in users can access the page to create a new short link
    if (templateVars["userInfo"] === undefined) {
        res.render("urls_login", templateVars);
    } else {
        res.render("urls_new", templateVars);
    }
});

// renders page for each specific short link
app.get("/urls/:id", (req, res) => {
    const templateVars = {
        shortURL: req.params.id,
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    if (req.session["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.session["user_id"]];
    }
    // redirects to login if userInfo is undefined
    if (!req.session["user_id"]) {
        res.redirect(`/login`);
        // check if urls/:id is an id that belongs to the logged in user
    } else if (
        !usersDB[req.session["user_id"]]["links"].includes(req.params.id)
    ) {
        templateVars["errors"].push(
            "Shortlink does not exist or does not belong to you"
        );
        res.render("urls_index", templateVars);
    } else {
        res.render("urls_show", templateVars);
    }
});

// This route creates a new link
// waits for a post to /urls and redirects them to the page for that specific link
app.post("/urls", (req, res) => {
    const templateVars = {
        shortURL: undefined,
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    if (req.session["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.session["user_id"]];
    }
    // first check if user is logged
    if (!req.session["user_id"]) {
        templateVars["errors"].push("Please Login");
        res.render("urls_index", templateVars);
        return;
    }
    // Checks if no link was entered
    if (req.body["longURL"] === "http://") {
        templateVars["errors"].push("INVALID URL");
        res.render("urls_new", templateVars);
    } else {
        // this is a valid new Link
        // generates a random 6 alpha numeric string
        var shortURL = generateRandomString();
        var userID = req.session["user_id"];

        // adds the long url to database
        urlDatabase[shortURL] = {};
        urlDatabase[shortURL]["visits"] = [];
        urlDatabase[shortURL]["longURL"] = req.body["longURL"];

        // adds the short link into the user objects ["links"]
        usersDB[userID]["links"].push(shortURL);

        res.redirect(`/urls/${shortURL}`);
    }
});

app.delete("/urls/:id", (req, res) => {
    const templateVars = {
        shortURL: req.params.id,
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    // need to make sure a cookie ID exists otherwise you can delete links from curl
    if (req.session["user_id"]) {
        const shortURL = req.params["id"];

        // check to see if the shortURL being deleted is part of the user's links
        if (usersDB[req.session["user_id"]]["links"].includes(shortURL)) {
            // deletes the shortUrl entry from the url database
            delete urlDatabase[shortURL];

            // delete the shortUrl entry in the users database
            const userID = req.session["user_id"];

            // filters out the deleted URL from the array and saves to new Array
            const newLinksArray = usersDB[userID]["links"].filter(function(
                element
            ) {
                return element !== shortURL;
            });
            // set the newLinksArray as the usersDB.userID.links
            usersDB[userID]["links"] = newLinksArray;

            res.redirect(`/urls`);
        } else {
            templateVars["errors"].push(
                "You are only allowed to delete your own links"
            );
            res.render("urls_index", templateVars);
        }
    } else {
        templateVars["errors"].push("Please Login to Delete your links");
        res.render("urls_index", templateVars);
    }
});

// Allows user to edit their existing short link to refer to a different long link
app.put("/urls/:id", (req, res) => {
    const templateVars = {
        shortURL: req.params.id,
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    // checks if user is logged in
    if (req.session["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.session["user_id"]];
    } else if (req.session["user_id"] === undefined) {
        templateVars["errors"].push("Please Login");
        res.render("urls_login", templateVars);
        return;
    }
    const shortURL = req.params["id"];
    const updatedLongURL = req.body["editLongURL"];
    // if user is logged in but does not own the url of given ID
    if (!templateVars["userInfo"]["links"].includes(shortURL)) {
        templateVars["errors"].push("You do not own this short link");
        res.render("urls_index", templateVars);
        return;
    }
    urlDatabase[shortURL]["longURL"] = updatedLongURL;
    res.redirect("/urls");
});

// redirects the user to whatever the shortURL is in the url database
app.get("/u/:shortURL", (req, res) => {
    const templateVars = {
        shortURL: req.params.shortURL,
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    if (req.session["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.session["user_id"]];
    }

    // req.session["visitor_id"] = generateRandomString();
    // if there is no userid, generate a visitor id session
    // add it to the list of visitors
    // before login or register, clear the cookies

    // if there isn't a user, generate a visitor id session, if visitor id exists do nothing
    if (req.session["visitor_id"]) {
        // do nothing
    } else if (req.session["user_id"] === undefined) {
        req.session["visitor_id"] = generateRandomString();
    }
    // add their visit to the urlDatabase[shortURL][visits]
    var visitorArray = [];
    if (req.session["user_id"] !== undefined) {
        visitorArray.push("someTime");
        visitorArray.push(req.session["user_id"]);
    } else if (req.session["user_id"] === undefined) {
        visitorArray.push("someTime");
        visitorArray.push(req.session["visitor_id"]);
    }
    urlDatabase[req.params.shortURL]["visits"].push(visitorArray);
    // Remember to clear cookies before login or register

    // get the short url from the id
    const shortURL = req.params["shortURL"];
    if (!(shortURL in urlDatabase)) {
        templateVars["errors"].push("ShortURL doesn't exist.");
        res.render("urls_index", templateVars);
    } else {
        // find the long URL in the database
        const longURL = urlDatabase[shortURL]["longURL"];
        // response redirect to the long url
        res.redirect(longURL);
    }
});

// handles the action of logging in
app.post("/login", (req, res) => {
    var errors = [];

    // check if valid login
    let validEmail = false;
    let validPassword = false;
    const DBValues = Object.values(usersDB);

    // loops through the database and looks for matching email and password
    DBValues.forEach(element => {
        if (req.body["email"] === element["email"]) {
            console.log("found email, now check password");
            validEmail = true;
            if (bcrypt.compareSync(req.body["password"], element["password"])) {
                console.log("match! logged in");
                validPassword = true;
                // if email and password match, sets cookie and renders
                req.session["user_id"] = element["id"];
                res.redirect("/urls");
            }
        }
    });

    if (validEmail === true && validPassword === false) {
        errors.push("Wrong Password");
        res.status(403);
    } else if (validEmail === false && validPassword === false) {
        errors.push("Wrong Username");
        res.status(403);
    }
    // if there is an error, re-render the page with the error, which will display on the ejs file
    if (errors.length > 0) {
        const templateVars = {
            shortURL: undefined,
            urls: urlDatabase,
            userInfo: undefined,
            errors: errors
        };
        res.render("urls_login", templateVars);
    }
});
// renders the login page
app.get("/login", (req, res) => {
    const templateVars = {
        shortURL: undefined,
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    // if user is already logged in, redirects to urls.
    if (req.session["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.session["user_id"]];
        res.redirect("/urls");
        return;
    }
    res.render("urls_login", templateVars);
});
// route to logout
app.post("/logout", (req, res) => {
    // deletes the cookie
    req.session = null;
    res.redirect("/urls");
});

// route to register
app.get("/register", (req, res) => {
    const templateVars = {
        shortURL: undefined,
        urls: urlDatabase,
        userInfo: undefined,
        errors: []
    };
    // if user is already logged in it will redirect them to /urls
    if (req.session["user_id"] !== undefined) {
        templateVars["userInfo"] = usersDB[req.session["user_id"]];
        res.redirect("/urls");
        return;
    }
    res.render("urls_register", templateVars);
});

app.post("/register", (req, res) => {
    var errors = [];
    // if email or password are empty, send back response with 400
    if (req.body["email"] === "" || req.body["password"] === "") {
        errors.push("Empty Email/Password");
        res.status(400);
    }
    // check if email already in DB
    var emailExists = false;
    const DBValues = Object.values(usersDB);
    DBValues.forEach(element => {
        if (req.body["email"] === element["email"]) {
            emailExists = true;
        }
    });

    if (emailExists) {
        errors.push("Email Already Exists");
        res.status(400);
    }

    // returns the html with whatever error there is, if no error it continues to create the user
    if (errors.length > 0) {
        const templateVars = {
            shortURL: undefined,
            urls: urlDatabase,
            userInfo: undefined,
            errors: errors
        };
        res.render("urls_register", templateVars);
        return;
    }

    const newUser = {};
    // gets the info for the object
    const id = generateRandomString();
    const email = req.body["email"];
    const password = bcrypt.hashSync(req.body["password"], 10);
    // put the info into an object
    newUser["id"] = id;
    newUser["email"] = email;
    newUser["password"] = password;
    newUser["links"] = [];
    // adds into the newUser usersDB
    usersDB[id] = newUser;
    // sets the cookie to userid cookie
    req.session["user_id"] = id;
    res.redirect("/urls");
});

app.listen(PORT, function() {
    console.log(`TinyApp is listening on port ${PORT}`);
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
