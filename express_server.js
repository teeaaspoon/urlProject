const express = require("express");
const app = express();
const PORT = 8080;
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

// use ejs as templating engine
app.set("view engine", "ejs");

var urlDatabase = {
    b2xVn2: "http://www.lighthouselabs.ca",
    "9sm5xK": "http://www.google.com"
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
    let templateVars = { urls: urlDatabase };
    res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
    res.render("urls_new");
});

app.get("/urls/:id", (req, res) => {
    let templateVars = { shortURL: req.params.id };
    res.render("urls_show", templateVars);
});

// waits for a post to /urls and redirects them to the page where they can look at the short and long url
app.post("/urls", (req, res) => {
    // generates a random 6 alpha numeric string
    var shortURL = generateRandomString();

    // adds the long url to database
    urlDatabase[shortURL] = req.body["longURL"];
    res.redirect(`/urls/${shortURL}`);
});

app.post("/urls/:id/delete", (req, res) => {
    let shortURL = req.params["id"];
    console.log(shortURL);

    delete urlDatabase[shortURL];
    res.redirect(`/urls`);
});

// redirects the user to whatever the shortURL is in the database
app.get("/u/:shortURL", (req, res) => {
    // got the short url from the id
    let shortURL = req.params["shortURL"];
    if (!(shortURL in urlDatabase)) {
        console.log("shortURL doesn't exist. Redirecting to homepage");
        res.redirect("/");
    } else {
        // find the long URL in the database
        let longURL = urlDatabase[shortURL];
        // response redirect to the long url
        res.redirect(longURL);
    }
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
