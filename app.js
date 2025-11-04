// ...new file...
require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;


app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.json()); // For parsing JSON request bodies
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// Create a MySQL connection pool
const conn = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'aj_fitness',
});

app.get('/', async (req, res) => {
    res.render("index.ejs");
});

app.get('/signup', async (req , res) => {
    res.render("signup.ejs");
})

app.get('/about', async (req, res) => {
    res.render("aboutus.ejs");
});

app.get('/contact', async (req, res) => {
    res.render("contactus.ejs");
});



app.get("/:id/events", async (req, res) => {
  const { id } = req.params;;

  conn.query('SELECT * FROM events', (err, results) => {
    if (err) {
      console.error('Error fetching events:', err);
      return res.status(500).send('Database error');
    }

    console.log(results);
    res.render('event.ejs', { events: results , userid : id});
  });
});

app.get('/:id/registerforevent', async (req, res) => {
    const { id } = req.params;
     const event = req.query.event;

     res.render("foreventregister.ejs",{ id , event});
})

app.post('/:id/registerforevent/:event', async (req, res) => {
     const { name, email, contact } = req.body;
  const { id, event } = req.params;

  conn.query(
    `INSERT INTO registered_for_events(userid , name, email, contact, event) VALUES (? , ?, ?, ?, ?)`,
    [id,name, email, contact, event],
    (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res.status(500).send("Database insertion failed");
      }
      console.log("Data inserted successfully, ID:", result.insertId);
      // Redirect user to homepage or confirmation page
      res.redirect(`/${id}/events`);
    }
  );
})


app.get('/:id/store', async (req, res) => {
    res.render("store.ejs");
});


app.get('/:id/newstore', async (req, res) => {
    res.render("newstore.ejs");
});


app.get('/:id/package', async (req,res) => {
     const trainer = req.query.trainer;
     const {id}= req.params;
    console.log(id);

    conn.query(`SELECT * FROM trainer_packages WHERE trainer_name = ?`, [trainer], (err, result) => {
    if (err) {
      console.error('Error inserting data:', err);
      return res.status(500).send('Database insertion failed');
    }
    console.log('Data  :', result);
     res.render("package.ejs", {
        trainer: trainer,
        packages: result,
        id : id
      });
  });
})

app.get('/:id/register', async( req, res) => {
    const {id } = req.params;
    const trainer = req.query.trainer;
    const selectedPackage = req.query.package;

    console.log(trainer);
    console.log(selectedPackage);

   res.render("register.ejs" ,{trainer , selectedPackage , id})
});

app.post('/:id/registerdata/:coach/:selectedPackage', (req, res) => {
  const { name, email, contact } = req.body;
  const { id, coach, selectedPackage } = req.params;

  console.log("User ID:", id);
  console.log("Coach:", coach);
  console.log("Package:", selectedPackage);

  conn.query(
    `INSERT INTO registered_users(name, email, contact, Membership, coach) VALUES (?, ?, ?, ?, ?)`,
    [name, email, contact, selectedPackage, coach],
    (err, result) => {
      if (err) {
        console.error("Error inserting data:", err);
        return res.status(500).send("Database insertion failed");
      }
      console.log("Data inserted successfully, ID:", result.insertId);
      // Redirect user to homepage or confirmation page
      res.redirect(`/${id}/package?trainer=${coach}&package=${encodeURIComponent(selectedPackage)}`);
    }
  );
});


app.get('/login', (req, res) => {
  res.render('login.ejs');
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send('Please enter both email and password.');
  }

  conn.query('SELECT * FROM users WHERE email = ?', [email], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Internal server error');
    }

    if (rows.length === 0) {
      return res.status(401).send('No account found with this email.');
    }

    const user = rows[0];

    if (user.password !== password) {
      return res.status(401).send('Incorrect password.');
    }

    // ✅ Role-based redirection
    if (user.role === "user") {
      console.log(`✅ User Login successful for user: ${user.email}`);
      res.redirect(`/${user.id}`);
    } 
    else if (user.role === "admin") {
      console.log(`✅ Admin Login successful for user: ${user.email}`);
      res.redirect(`/${user.id}/admindashboard`);
    } 
    else {
      console.log(`⚠️ Unknown role for user: ${user.email}`);
      res.status(403).send('Access denied. Invalid role.');
    }
  });
});


app.get('/:id', async (req, res) => {
    const {id} = req.params;
    res.render("logineduser.ejs" , {id});
});




app.post('/signup', (req, res) => {
  const { name, email, contact, password, role } = req.body ;
  console.log(name, email, contact, password, role );

  conn.query('INSERT INTO users (name, email, contact, password, role) VALUES (?, ?, ?, ?, ?)', [name, email, contact, password, role], (err, result) => {
    if (err) {
      console.warn('Insert with role failed, attempting without role:', err.code);
        
    return res.redirect('/');
        } else {
      return res.redirect('/');
    }
  });
});




//********************ADMIN**************** */
app.get("/:id/admindashboard", (req, res) => {
  const { id } = req.params;

  // ✅ Step 1: Fetch all users with role = 'user'
  conn.query("SELECT * FROM users WHERE role = 'user'", (err, userRes) => {
    if (err) {
      console.error("❌ Error fetching users:", err);
      return res.status(500).send("Database error while fetching users.");
    }

    // ✅ Step 2: Fetch all trainer packages
    conn.query("SELECT trainer_name, ANY_VALUE(features) AS features FROM trainer_packages GROUP BY trainer_name;", (err, trainerRes) => {
      if (err) {
        console.error("❌ Error fetching trainer packages:", err);
        return res.status(500).send("Database error while fetching trainer packages.");
      }

      // console.log(trainerRes);

      // ✅ Step 3: Fetch events and number of participants for each
      const eventsQuery = `
   SELECT 
  e.id,
  e.title, 
  e.category, 
  e.date, 
  e.time, 
  e.location, 
  e.price, 
  e.img, 
  e.description,
  COUNT(r.userid) AS participants
FROM events e
LEFT JOIN registered_for_events r 
  ON e.title = r.event
GROUP BY 
    e.id,
  e.title, 
  e.category, 
  e.date, 
  e.time, 
  e.location, 
  e.price, 
  e.img, 
  e.description;

      `;

      conn.query(eventsQuery, (err, eventRes) => {
        if (err) {
          console.error("❌ Error fetching events:", err);
          return res.status(500).send("Database error while fetching events.");
        }
        // console.log(eventRes);

        // ✅ Step 4: Render dashboard with all data
        res.render("admin.ejs", {
          userId: id,
          users: userRes,
          trainers: trainerRes,
          events: eventRes
        });
      });
    });
  });
});





//***************CRUD OPERATIONS******************** */
app.post('/admin/add-event/:id', (req, res) => {
  const { title, category, date, time, location, price, description } = req.body;
  const { id } = req.params;
  const img = "https://images.pexels.com/photos/416778/pexels-photo-416778.jpeg";

  conn.query(
    'INSERT INTO events (title, category, date, time, location, price, img, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [title, category, date, time, location, price, img, description],
    (err, result) => {
      if (err) {
        console.error('Insert failed:', err);
        return res.status(500).send('Error inserting event');
      }

      // ✅ Redirect after successful insert
      res.redirect(`/${id}/admindashboard`);
    }
  );
});

app.get('/admin/edit-event/:event_id/:id', (req, res) => {
  const { event_id, id } = req.params;

  conn.query('SELECT * FROM events WHERE id = ?', [event_id], (err, results) => {
    if (err) {
      console.error('Error fetching event for edit:', err);
      return res.status(500).send('Database error');
    }

    if (results.length === 0) {
      return res.status(404).send('Event not found');
    }

    res.render('editEvent.ejs', { userId: id, event: results[0] });
  });
});

app.post('/admin/update-event/:event_id/:id', (req, res) => {
  const { event_id, id } = req.params;
  const { title, category, date, time, location, price, description } = req.body;

  conn.query(
    'UPDATE events SET title=?, category=?, date=?, time=?, location=?, price=?, description=? WHERE id=?',
    [title, category, date, time, location, price, description, event_id],
    (err) => {
      if (err) {
        console.error('Error updating event:', err);
        return res.status(500).send('Database update error');
      }
      console.log('✅ Event updated successfully');
      res.redirect(`/${id}/admindashboard`);
    }
  );
});


app.delete('/admin/delete-event/:event_id/:id', async (req ,res) => {
    const { event_id , id} = req.params;

   conn.query("DELETE FROM events WHERE id = ?",[event_id], (err, eventRes) => {
      if (err) {
        console.error("Error fetching trainer packages:", err);
        return res.status(500).send("Database error while fetching trainer packages.");
      }
  
      res.redirect(`/${id}/admindashboard`)
    })
})




app.delete('/admin/delete-event/:event_id/:id', async (req ,res) => {
    const { event_id , id} = req.params;

   conn.query("DELETE FROM events WHERE id = ?",[event_id], (err, eventRes) => {
      if (err) {
        console.error("Error fetching trainer packages:", err);
        return res.status(500).send("Database error while fetching trainer packages.");
      }
  
      res.redirect(`/${id}/admindashboard`)
    })
})


//******************************* */s

app.get('/:id/admindashboard/:event_title/viewparticipants', (req, res) => {
  const { event_title, id } = req.params;
console.log(event_title);
  conn.query('SELECT * FROM registered_for_events WHERE event = ?', [event_title], (err, results) => {
    if (err) {
      console.error('Error fetching event for edit:', err);
      return res.status(500).send('Database error');
    }

    res.render('viewparticipant.ejs', { id, participant: results });
  });
});




app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});