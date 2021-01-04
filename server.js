let express = require('express')
//let path = require('path')
let nodemailer = require('nodemailer')  
let bodyParser = require("body-parser");
//let engines = require('consolidate');
const { Pool } = require("pg");
const cons = require('consolidate');

const transporter = nodemailer.createTransport(
    {
        secure: true,
        service: 'gmail',
        auth: 
        {
          user: 'contact.fideltycard@gmail.com',
          pass: 'lnjfjtxqancrtykk'
        }
    })

let d = new Date();
let date = `${d.getDay()}-${d.getMonth()}-${d.getYear()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}: `;    



const {
    PORT = 8080,
    PGHOST = "ec2-34-192-173-173.compute-1.amazonaws.com",
    PGUSER = "dyjxucfevhnuan",
    PGPASSWORD = "3bca1dba4582e00c9ab1b537d2cb61ba35a07340a2dde8dff825f458a33cfda8",
    PGDATABASE = "d23qjb8d66t6ip",
    PGPORT = "5432",
    SESS_NAME = "sid",
    SESS_SECRET = "raboule_le_fric",
    SESS_LIFETIME = 24 * 60 * 60 * 1000 // 24h
} = process.env;


const pool = new Pool(
    {
        user: PGUSER,
        host: PGHOST,
        database: PGDATABASE,
        password: PGPASSWORD,
        port: PGPORT
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
        from: 'contact.fideltycard@gmail.com',
        to: 'contact.fideltycard@gmail.com',
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
        from: 'contact.fideltycard@gmail.com',
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

            let queryUser = "INSERT INTO users(\"idUsers\", \"surname\", \"name\", \"mail\", \"male\", \"woman\", \"other\", \"birthDate\", \"message\") VALUES('" + idUser + "', '" + answerUser.userF.prenom + "', '" + answerUser.userF.nom + "', '" + answerUser.userF.email + "', '" + answerUser.userF.homme + "', '" + answerUser.userF.femme + "', '" + answerUser.userF.autre + "', " + dateDeNaissance + ", '" + answerUser.userF.message + "');";

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
