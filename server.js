let express = require('express')
//let path = require('path')
let nodemailer = require('nodemailer')  
let bodyParser = require("body-parser");
//let engines = require('consolidate');
const { Pool } = require("pg");
const cons = require('consolidate');
const config = require('./config');

const transporter = nodemailer.createTransport(
    {
        secure: true,
        service: 'gmail',
        auth: 
        {
          user: config.mail.user,
          pass: config.mail.password
        }
    })

let d = new Date();
let date = `${d.getDay()}-${d.getMonth()}-${d.getYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}: `;    


const {
    PORT = config.web.PORT, // Port for the webserver
    // postgresql
    PGHOST = config.web.PGHOST,
    PGUSER = config.web.PGUSER,
    PGPASSWORD = config.web.PGPASSWORD,
    PGDATABASE = config.web.PGDATABASE,
    PGPORT = config.web.PGPORT,
    // cookies
    SESS_NAME = config.cookie.SESS_NAME,
    SESS_SECRET = config.cookie.SESS_SECRET,
    SESS_LIFETIME = config.cookie.SESS_LIFETIME
} = process.env;


const pool = new Pool(
    {
        user: PGUSER,
        host: PGHOST,
        database: PGDATABASE,
        password: PGPASSWORD,
        port: PGPORT,
        ssl: { rejectUnauthorized: false }
    }
);

var app = express();

app.use(express.static(__dirname + '/'));
app.set('views', __dirname + '/views')
app.engine('html', require('ejs').renderFile)
app.set('view engine', 'html')

app.use(bodyParser.urlencoded({extended: true}))


app.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.render('index.html')
})

app.post('/sendMail', (req, res) => 
{     
    let mailOptions = 
    {
        from: config.mail.user,
        to: config.mail.user,
        subject: req.body.name + ' - ' + req.body.email,
        text: req.body.message
    }
      
    transporter.sendMail(mailOptions, (error, info) => 
    {
        if (error) 
        {
            console.log(error)
        } 
        else 
        {
            console.log('Email sent from ' + req.body.name + ' - email = ' + req.body.email + ' to ' + mailOptions.from)
        }
    })


    mailOptions = 
    {
        from: config.mail.user,
        to: req.body.email,
        subject: 'Merci de nous avoir contactés !',
        text: 'Chère Madame/Cher Monsieur ' + req.body.name + ', \n \n Merci d\'avoir contacté Fidelity ! \n Laissez-nous prendre en compte votre demande et nous vous recontacterons dans les plus brefs délais. \n \n \n Bien cordialement. \n \n L\'équipe Fidelity'
    }

    transporter.sendMail(mailOptions, (error, info) => 
    {
        if (error) 
        {
            console.log(error)
        } 
        else 
        {
            console.log('Email sent from ' + mailOptions.from + ' to ' + req.body.email)

            res.redirect('/');
        }
    })
})


app.get('/questionnaire',(req, res) =>
{
    res.setHeader("Content-Type", "text/html");

    pool.query('SELECT * FROM questions', (err, resp) => 
    {
        if(err)
        {
            console.log(date + "Error bdd -> " + err.stack)
        }
        else {
            
            res.render('survey.ejs', { Questions : resp.rows})
        }
    })
})


app.post('/questionnaire', (req, respo) => 
{
    respo.setHeader("Content-Type", "text/html");

    const answerUser = req.body;

    pool.query("SELECT max(\"idUsers\") FROM users;", (error, response) => 
    {
        if(error)
        {
            console.log(date + "Error bdd -> " + error.stack);
        }
        else 
        {
            const idUser =  isNaN(parseInt(Object.values(response.rows[0]))) ? 1 : parseInt(Object.values(response.rows[0])) + 1;

            let dateDeNaissance = answerUser.userF.dateDeNaissance == '' ? null : "'" + answerUser.userF.dateDeNaissance + "'";

            let queryUser = "INSERT INTO users(\"idUsers\", \"surname\", \"name\", \"mail\", \"male\", \"woman\", \"birthDate\") VALUES('" + idUser + "', '" + answerUser.userF.prenom + "', '" + answerUser.userF.nom + "', '" + answerUser.userF.email + "', '" + answerUser.userF.homme + "', '" + answerUser.userF.femme + "', " + dateDeNaissance + ");";

            console.log(queryUser);

            pool.query(queryUser, (err, resp) => 
            {
                if(err)
                {
                    console.log(date + "Error bdd -> " + err.stack);
                }
                else 
                {
                    console.log('Utilisateur : ' + answerUser.userF.email + ' ajouté');

                        pool.connect((err, db, done) => 
                        {
                            const shouldAbort = err => {
                              if (err) {
                                console.error('Error in transaction', err.stack)

                                db.query('ROLLBACK', err => 
                                {
                                  if (err) {
                                    console.error('Error rolling back client', err.stack)
                                  }
                                  // release the client back to the pool
                                  done()
                                })
                              }
                              return !!err
                            }

                            try 
                            {
                                for (let i = 1; i <= answerUser.score.length; i++)
                                {
                                    console.log("Tour de boucle : " + i)

                                    if (i != 4) 
                                    {
                                        let queryNormal = "INSERT INTO answers(\"idUsers\", \"qKey\", \"answer1\") VALUES('" + idUser + "', '" + i + "', '" + answerUser.score[i-1] + "');"

                                        console.log(queryNormal);

                                        db.query(queryNormal);
                                        
                                        console.log('Question numéro ' + i + ' ajoutée');
                                    }
                                    else
                                    {
                                        console.log("Nombre de reponse a la question 4 : " + answerUser.score[i-1].length);

                                        let queryNotNormal = "INSERT INTO answers(\"idUsers\", \"qKey\"";

                                        for (let j = 1; j <= answerUser.score[i-1].length; j++)
                                        {
                                            queryNotNormal = queryNotNormal + ', \"answer' + j + '\"';
                                        }

                                        queryNotNormal = queryNotNormal + ") VALUES('" + idUser + "', '" + i 

                                        for (let j = 0; j < answerUser.score[i-1].length; j++)
                                        {
                                            queryNotNormal = queryNotNormal + "', '" + answerUser.score[i-1][j];
                                        }

                                        queryNotNormal = queryNotNormal + "');";

                                        console.log(queryNotNormal);

                                        db.query(queryNotNormal);

                                        console.log('Question numéro ' + i + ' ajoutée');
                                    }
                                }
                                respo.render('index.html');
                            }
                            catch (e) {
                                console.log(date + "Error bdd -> " + e.stack);

                                db.query("ROLLBACK");

                                throw e;

                            } finally {
                                db.release();
                            };
                        });
                };
            })
        }
    })
})


// En cas d'url incorrect on redirect a la page d'acceuil
app.use((req, res, next) =>
{
    res.setHeader("Content-Type", "text/html");
    res.redirect('/')
})


// Lancement du serveur
app.listen(PORT, () =>
  console.log(date + "Serveur is listening in http://localhost:" + PORT)
);
