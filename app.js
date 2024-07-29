const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const app = express();

//admin email = admin@email.com, password = 12345

let userID = 0;
let userpassword = 0;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images');
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Create MySQL connection
const connection = mysql.createConnection({
    //host: 'localhost',
    //user: 'root',
    //password: '',
    //database: 'mini_project'
    host: 'sql.freedb.tech',
    user: 'freedb_daroot',
    password: 'qZwx!eW8mmZ?7HG',
    database: 'freedb_mini_project'
});
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    return;
    }
    console.log('Connected to MySQL database');
});
// Set up view engine
app.set('view engine', 'ejs');
// enable static files
app.use(express.static('public'));
app.use(express.urlencoded({
    extended: false
}));
////////////////////////////Homepage////////////////////////////////////////////////
app.get('/', (req, res) => {
    const sql = 'SELECT * FROM dogs';
    connection.query(sql,(error,results)=>{
        if(error){
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving dogs');
        }else{
            const sql = 'SELECT * FROM filtertags';
            connection.query(sql,(error,tagResults)=>{
                if(error){
                    console.error('Database query error:', error.message);
                }
                res.render('homepage', {dogs: results, tags:tagResults});
            });
        } 
    });
});
///////////////////////////Filtered Homepage//////////////////////////////////////////
app.get('/filter', (req, res) => {
    const { gender, HDB } = req.query;
    let sql = 'SELECT * FROM dogs AS D INNER JOIN doghastags AS DT ON D.dogID = DT.dogID';
    let stuff = [];
    if(gender){
        stuff.push('D.dogGender LIKE ?');
    }
    if(HDB){
        stuff.push('D.isHDBApproved = 1');
    }
    const tags = req.query.tags
    let l = 0
    if(tags){
        pain = 'DT.tagID in (';
        for(n=0;n<tags.length;n++) {
            pain += tags[n];
            if (n<tags.length - 1){
                pain += ',';
            }
        } 
        stuff.push( pain + ')GROUP BY DT.dogID HAVING COUNT(DISTINCT DT.tagID) = ' + tags.length)
        l = 1
    }

    if(stuff.length>0){
        sql += ' WHERE ' + stuff.join(' AND ');
    }
    if(l==0){
        sql += ' GROUP BY DT.dogID '
    }
    connection.query(sql,[gender],(error,results)=>{
        if(error){
            console.error('Database query error:', error.message);
            return res.status(500).send('Error Retrieving dogs');
        }else{
            const sql = 'SELECT * FROM filtertags';
            connection.query(sql,(error,tagResults)=>{
                if(error){
                    console.error('Database query error:', error.message);
                }
                res.render('homepage', {dogs: results, tags:tagResults});
            });
        } 
    });
});
////////////////////////////Dog Detail///////////////////////////////
app.get('/dog/:id', (req,res)=>{
    const dogId = req.params.id;
        const sql = "SELECT * FROM dogs AS D INNER JOIN doghastags AS DT ON D.dogID = DT.dogID INNER JOIN filtertags AS T ON DT.tagID = T.tagID WHERE D.dogID = ?;";
        connection.query(sql,[dogId],(error,results)=>{
            if(error){
                console.error('Database query error:',error.message);
                return res.status(500).send('Error Retrieving Dog by ID');
            }
            if(results.length > 0){
                res.render('dogDetail',{dog: results, trait : 1});
            }else{
                const MIA = "SELECT * FROM dogs WHERE dogID = ?;"
                connection.query(MIA,[dogId],(error,result)=>{
                    if(error){
                        console.error('Database query error:',error.message);
                        return res.status(500).send('Error Retrieving Dog by ID');
                    }
                    if(result.length > 0){
                        res.render('dogDetail',{dog: result, trait : 0});
                    }else{
                        res.status(404).send('Dog not found');
                    }
                });  
            }
        })
});
////////////////////////////Adopt Form//////////////////////////////////////////////
app.get('/adoptForm/:id', (req,res)=>{
    const dogId = req.params.id;
    const sql = "SELECT * FROM dogs WHERE dogID = ?";
    connection.query(sql,[dogId],(error,results)=>{
        if(error){
            console.error('Database query error:',error.message);
            return res.status(500).send('Error Retrieving Dog by ID');
        }
        if(results.length > 0){
            res.render('adoptForm',{dog: results[0]});
        }else{
            res.status(404).send('Dog not found');
        }
    })
});
//////////////////////////Post Adopt Form///////////////////////////////////
app.post('/adoptForm/:id', (req,res)=>{
    const today = new Date();
    const dogId = req.params.id;
    const { name, email, phone, age, address, description} = req.body;

    const sql = "INSERT INTO formstable (personName, email, phoneNumber, age, address, sDescription, daDate, dogID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    connection.query(sql,[name, email, phone, age, address, description, today, dogId],(error,results)=>{
        if(error){
            console.error("Error adding Form:", error);
            res.status(500).send('Error adding form');
        }else{
            res.redirect('/'); 
        }
    });
});
///////////////////////////////Delete Form/////////////////////////////////////
app.get('/deleteForm/:id', (req, res) =>{
    const formId=req.params.id;
    const sql = "DELETE FROM formstable WHERE formID = ?";
    connection.query(sql,[formId],(error,results)=>{
        if(error){
            console.error("Error deleting Form:", error);
            res.status(500).send('Error deleting Form');
        } else {
            res.redirect('/admin');
        }
    })
});
////////////////////Viewing Request/////////////////////////////////////
app.get('/viewRequest/:id', (req,res)=>{
    if(userID === 0 && userpassword == 0){
        res.redirect('/adminLoginPage')
    }else{
        const dogId = req.params.id;
        const sql = "SELECT * FROM formstable AS F INNER JOIN dogs AS D ON D.dogID = F.dogID WHERE D.dogID = ?"
        connection.query(sql,[dogId],(error,results)=>{
            if(error){
                console.error("Error in Getting Form",error);
                res.status(500).send('Error in getting form');
            }else{
                res.render('viewForm',{form: results});
            }
        })
    }
});

/////////////////////////////Admin Dashboard////////////////////////////////////
app.get('/admin', (req, res) => {
    if(userID === 0 && userpassword == 0){
        res.redirect('/adminLoginPage')
    }else{
        const sql = 'SELECT * FROM dogs';
        connection.query(sql,(error,results)=>{
            if(error){
                console.error('Database query error:', error.message);
                return res.status(500).send('Error Retrieving dogs');
            }else{
                const sql = 'SELECT * FROM filtertags';
                connection.query(sql,(error,tagResults)=>{
                    if(error){
                        console.error('Database query error:', error.message);
                    }
                    res.render('adminIndex', {dogs: results, tags:tagResults});
                });
            } 
        });
    }
});
///////////////////////////Admin Filtered Homepage//////////////////////////////////////////
app.get('/adminFilter', (req, res) => {
    if(userID === 0 && userpassword == 0){
        res.redirect('/adminLoginPage')
    }else{
        const { gender, HDB, request } = req.query;
        let sql = 'SELECT * FROM dogs AS D INNER JOIN doghastags AS DT ON D.dogID = DT.dogID';
        let stuff = [];
        if(request){
            sql+=(' INNER JOIN formstable AS F ON F.dogID = D.dogID ');
        }
        if(gender){
            stuff.push('D.dogGender LIKE ?');
        }
        if(HDB){
            stuff.push('D.isHDBApproved = 1');
        }
        const tags = req.query.tags
        let l = 0
        if(tags){
            pain = 'DT.tagID in (';
            for(n=0;n<tags.length;n++) {
                pain += tags[n];
                if (n<tags.length - 1){
                    pain += ',';
                }
            } 
            stuff.push( pain + ')GROUP BY DT.dogID HAVING COUNT(DISTINCT DT.tagID) = ' + tags.length)
            l = 1
        }
        if(stuff.length>0){
            sql += ' WHERE ' + stuff.join(' AND ');
        }
        if(l==0){
            sql += ' GROUP BY DT.dogID '
        }
        connection.query(sql,[gender],(error,results)=>{
            if(error){
                console.error('Database query error:', error.message);
                return res.status(500).send('Error Retrieving dogs');
            }else{
                const sql = 'SELECT * FROM filtertags';
                connection.query(sql,(error,tagResults)=>{
                    if(error){
                        console.error('Database query error:', error.message);
                    }
                    res.render('adminIndex', {dogs: results, tags:tagResults});
                });
            } 
        });
    }
});
//////////////////////////Admin Dog Details///////////////////////////////////
app.get('/dogAdmin/:id', (req,res)=>{
    if(userID === 0 && userpassword == 0){
        res.redirect('/adminLoginPage')
    }else{
        const dogId = req.params.id;
        const why = 'SELECT * FROM formstable WHERE dogID = ?;'
        let dum = 0
        connection.query(why,[dogId],(error, ahhh)=>{
            if(error){
                console.error('Database query error:',error.message);
                return res.status(500).send('Bruh');
            }else if(ahhh.length>0){
                dum = 1
            }
        })
        const sql = "SELECT * FROM dogs AS D INNER JOIN doghastags AS DT ON D.dogID = DT.dogID INNER JOIN filtertags AS T ON DT.tagID = T.tagID WHERE D.dogID = ?;";
        connection.query(sql,[dogId],(error,results)=>{
            if(error){
                console.error('Database query error:',error.message);
                return res.status(500).send('Error Retrieving Dog by ID');
            }
            if(results.length > 0){
                res.render('dogAdmin',{dog: results, trait : 1, wry:dum});
            }else{
                const MIA = "SELECT * FROM dogs WHERE dogID = ?;"
                connection.query(MIA,[dogId],(error,result)=>{
                    if(error){
                        console.error('Database query error:',error.message);
                        return res.status(500).send('Error Retrieving Dog by ID');
                    }
                    if(result.length > 0){
                        res.render('dogAdmin',{dog: result, trait : 0, wry:dum});
                    }else{
                        res.status(404).send('Dog not found');
                    }
                });  
            }
        })
    }
});
////////////////////////////Add Dog Page//////////////////////////////////
app.get('/addDog',(req,res)=>{
    if(userID === 0 && userpassword == 0){
        res.redirect('/adminLoginPage')
    }else{
        const sql = 'SELECT * FROM filtertags';
        connection.query(sql,(error,results)=>{
            if(error){
                console.error('Database query error:', error.message);
                res.render('addDog');
            }
            res.render('addDog', {tags: results});
        });
    }
});
//////////////////////////Add new Traits//////////////////////////////////////////
app.post('/addTag', (req,res)=>{
    if(userID === 0 && userpassword == 0){
        res.redirect('/adminLoginPage')
    }else{
        const {tName} = req.body;
        const sql = "INSERT INTO filtertags (tagName) VALUES (?)";
        connection.query(sql,[tName],(error,results)=>{
            if(error){
                console.error("Error adding Trait:", error);
                res.status(500).send('Error adding Trait');
            }else{
                res.redirect("/addDog")
            }
        });
    }
});
///////////////////////Add new Dog/////////////////////////////////////////////
app.post('/addDog', upload.single('image'), (req,res)=>{
    if(userID === 0 && userpassword == 0){
        res.redirect('/adminLoginPage')
    }else{
        const { name, dob, gender, personality, HDB} = req.body;
        let image;
        if (req.file){
            image = req.file.filename;
        } else {
            image = null;
        }
        
        const tags = req.body.tags
        const sql = "INSERT INTO dogs (dogName, dogEDOB, dogGender, dogPersonality, isHDBApproved, dogImage) VALUES (?, ?, ?, ?, COALESCE(?, 0), ?)";
        connection.query(sql,[name, dob, gender, personality, HDB, image],(error,results)=>{
            if(error){
                console.error("Error adding Dog:", error);
                res.status(500).send('Error adding Dog');
            }else{
                if (tags){
                    for(let n=0; n<tags.length; n++){
                        const tagsql = "INSERT INTO doghastags (dogID, tagID) VALUES((SELECT MAX(dogID) FROM dogs), ?)";
                        new Promise((resolve, reject) =>{
                            connection.query(tagsql,[tags[n]],(error,results)=>{
                                if(error){
                                    console.error("Error adding Tags:", error);
                                    reject(error);
                                }else{
                                    resolve(results);
                                }
                            });
                        });    
                    } 
                }
                res.redirect('/admin'); 
            }
        });
    }
});
////////////////////////////Delete Dog//////////////////////////////////////
app.get('/deleteDog/admin/:id', (req, res) =>{
    if(userID === 0 && userpassword == 0){
        res.redirect('/adminLoginPage')
    }else{
        const dogId=req.params.id;
        const tagsql = "DELETE FROM doghastags WHERE dogID = ?";
        new Promise((resolve, reject) =>{
            connection.query(tagsql,[dogId],(error,results)=>{
                if(error){
                    console.error("Error deleting Tags link:", error);
                    reject(error);
                }else{
                    resolve(results);
                }
            });
        });   
        const formsql = "DELETE FROM formstable WHERE dogID = ?";
        new Promise((resolve, reject) =>{
            connection.query(formsql,[dogId],(error,results)=>{
                if(error){
                    console.error("Error deleting form(s):", error);
                    reject(error);
                }else{
                    resolve(results);
                }
            });
        });   
        const sql='DELETE FROM dogs WHERE dogID = ?';
        connection.query( sql, [dogId], (error, results) => {
            if(error){
                console.error("Error deleting Dog:", error);
                res.status(500).send('Error deleting Dog');
            } else {
                res.redirect('/admin');
            }
        });
    }
});
////////////////////////////Update Dog info page////////////////////////////////
app.get('/editDog/admin/:id', (req,res) => {
    if(userID === 0 && userpassword == 0){
        res.redirect('/adminLoginPage')
    }else{
        const dogId = req.params.id;
        const sql = 'SELECT * FROM dogs AS D INNER JOIN doghastags AS DT ON D.dogID = DT.dogID INNER JOIN filtertags AS T ON DT.tagID = T.tagID WHERE D.dogID = ?;';
        connection.query( sql , [dogId], (error, results) => {
            if(error){
                return res.status(500).send('Error retrieving Dog by ID');
            }
            if (results.length > 0){
                const sql = 'SELECT * FROM filtertags';
                connection.query(sql,(error,tagResult)=>{
                    if(error){
                        console.error('Database query error:', error.message);
                        res.render('addDog');
                    }
                    res.render('editDog',{ dog: results, tags: tagResult });
                });
            } else {
                const MIA = "SELECT * FROM dogs WHERE dogID=?;"
                connection.query(MIA,[dogId],(error,results)=>{
                    if(error){
                        console.error('Database query error:',error.message);
                        return res.status(500).send('Error Retrieving Dog by ID');
                    }
                    else if(results.length > 0){
                        const sql = 'SELECT * FROM filtertags';
                        connection.query(sql,(error,tagResult)=>{
                            if(error){
                                console.error('Database query error:', error.message);
                                return res.status(500).send('Error Retrieving tag by ID');
                            }
                            res.render('editDog',{ dog: results, tags: tagResult });
                        });
                    }else{
                        res.status(404).send('Dog not found');
                    }
                });
            }
        });
    }
});
/////////////////////////Update Dog Info//////////////////////////////*scuff lol*/
app.post('/editDog/admin/:id', upload.single('image'), (req, res) => {
    if(userID === 0 && userpassword == 0){
        res.redirect('/adminLoginPage')
    }else{
        const dogId = req.params.id;
        const { name, dob, gender, personality, HDB} = req.body;
        let image = req.body.currentImage;
        if (req.file){
            image = req.file.filename;
        }
        const tags = req.body.tags
        const tagsql = "DELETE FROM doghastags WHERE dogID = ?";
        connection.query(tagsql,[dogId],(error,results)=>{
            if(error){
                console.error("Error adding Tags:", error);
            }else{
                const sql = 'UPDATE dogs SET dogName = ?, dogEDOB = ?, dogGender = ?, dogPersonality =?, isHDBApproved =?, dogImage =? WHERE dogID = ?';
                connection.query( sql, [name, dob, gender, personality, HDB, image, dogId], (error, results) =>{
                    if(error){
                        console.error("Error updating dog table:", error);
                        res.status(500).send('Error updating dog table');
                    } else {
                        if (tags){
                            for(let n=0; n<tags.length; n++){
                                const tagsql = "INSERT INTO doghastags (dogID, tagID) VALUES(?, ?)";
                                new Promise((resolve, reject) =>{
                                    connection.query(tagsql,[dogId, tags[n]],(error,results)=>{
                                        if(error){
                                            console.error("Error adding Tags:", error);
                                            reject(error);
                                        }else{
                                            resolve(results);
                                        }
                                    });
                                });    
                            } 
                        }
                        res.redirect('/admin')
                    }
                });
            }
        });
    }     
});
//////////////////////////Admin LOgin///////////////////////
app.get('/adminLoginPage', (req, res) => {
    res.render('adminLogin', {wrong : 0});
});
///////////////////Admin Login FR now////////////////////////////
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    let sql = 'SELECT * FROM adminuser WHERE adminEmail = ? AND adminPassword = ?';
    connection.query(sql,[email, password],(error, results)=>{
        if(error){
            console.error("Error Logining:", error);
            res.status(500).send('Error database Login');
        }
        else if(results.length>0){
            userID = email
            userpassword = password
            res.redirect('/admin')
        }else{
            res.render('adminLogin', {wrong : 1});
        }
    }); 
});
/////////////////Admin Logout////////////////////////////////////////////
app.get('/adminLogout', (req, res) => {
    userID = 0
    userpassword = 0
    res.redirect('/')
});
/////////////////////Add Admin User Page///////////////////////////////////
app.get('/addAdmin', (req, res) => {
    if(userID === 0 && userpassword == 0){
        res.redirect('/adminLoginPage')
    }else{
        res.render('addAdmin', {wrong: 0});
    }
});
///////////////////////Add Admin User//////////////////////////////
app.post('/ADDmin', (req, res)=>{
    if(userID === 0 && userpassword == 0){
        res.redirect('/adminLoginPage')
    }else{
        const { email, password ,repassword } = req.body;
        if (password == repassword){
            let sql = 'SELECT * FROM adminuser WHERE adminEmail = ?';
            connection.query(sql,[email],(error, results)=>{
            if(error){
                console.error("Error Logining:", error);
                res.status(500).send('Error database Login');
            }
            else if(results.length>0){
                res.render('addAdmin', {wrong : 2});
            }else{
                let realsql = "INSERT INTO adminuser(adminEmail, adminPassword) VALUES ( ? , ? )"
                connection.query(realsql,[email, password],(error, results)=>{
                    if(error){
                        console.error("Error INserting:", error);
                        res.status(500).send('Error database Insert');
                    }else{
                        res.redirect('/admin');
                    }
                })
            }
        });
        }else{
            res.render('addAdmin', {wrong : 1});
        }
    } 
})
////////////////////////////////////////////////////////
const PORT = 3306;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
