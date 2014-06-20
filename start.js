/*####################### START SQLITE3 FUNCTIONS ########################*/
var fs = require("fs");
var file = "chat.db";
var exists = fs.existsSync(file);
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(file);
//timestamp
var timestamp = require('console-timestamp');
var now = new Date();

//init server
db.serialize(function () {
    if (!exists) {
        db.run("CREATE TABLE olab_chat_history (Email_agent TEXT, Email_client TEXT, Email_from TEXT, Message TEXT, Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL)");
        db.run("CREATE TABLE olab_chat_users (Email_agent TEXT, User_name TEXT, User_password TEXT, Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL, PRIMARY KEY(Email_agent ASC))");
    }
});
db.close();


var md5 = require('MD5');
function sqlite_add_agent_user_chat() {
    console.log("ADD NEW AGENT USER");
    db = new sqlite3.Database(file);
    db.serialize(function () {
        stmt = db.prepare("INSERT INTO olab_chat_users VALUES (?,?,?,?)");
        stmt.bind("ebc@g4all.mx", "Eduardo Beltran", md5('g4alalo2014'), timestamp('DD-MM-YYYY hh:mm:ss'));
        stmt.get(function (error, rows) {
            if (error) {
                console.log("ERROR - sqlite_add_agent_user_chat()");
                sqlite_chat_print_all("olab_chat_users");
            } else {
                console.log("RESULT NEW USER AGENT ADDED");
                sqlite_chat_print_all("olab_chat_users");
            }
        });
    });
    stmt.finalize();
    db.close();
}
//sqlite_add_agent_user_chat();



function sqlite_validate_user_data(user_email, user_pass, callback) {
    console.log("########################### START VALIDATION ###########################");
    db = new sqlite3.Database(file);
    db.serialize(function () {
        var stmt = "SELECT * FROM olab_chat_users WHERE Email_agent = '" + user_email + "' AND User_password = '" + md5(user_pass) + "';";
        db.all(stmt, function (err, rows) {
            if (err)
                console.log("ERROR - sqlite_validate_user_data()");
            if (rows.length == 0)
                callback({
                    auth: false
                });
            else
                callback({
                    auth: true,
                    User_name: rows[0].User_name
                });
        });
    });
    db.close();
    console.log("########################### END VALIDATION ###########################");
}
/*sqlite_validate_user_data("ebc@g4all.mx","g4alalo2014",function(data){
    if( data.auth ){
        console.log(data);
        console.log("Redirect agent_chat");
    } else {
        console.log("Redirect login");
    }
});
*/


//olab print all conversations chat
function sqlite_chat_print_all(table) {
    db = new sqlite3.Database(file);
    db.serialize(function () {
        db.all("SELECT * FROM " + table + ";", function (err, rows) {
            if (err)
                console.log("ERROR - sqlite_chat_print_all()");
            else
                console.log(rows);
        });
    });
    db.close();
}

function sqlite_chat_add_new_message(object_vals, callback) {
    db = new sqlite3.Database(file);
    console.log("NEW MESSAGE TO SAVE");
    db.serialize(function () {
        stmt = db.prepare("INSERT INTO olab_chat_history VALUES (?,?,?,?,?)");
        stmt.bind(object_vals.email_agent, object_vals.email_client, object_vals.email_from, object_vals.message, timestamp('DD-MM-YYYY hh:mm:ss'));
        stmt.get(function (error, rows) {
            if (error) {
                console.log("ERROR - sqlite_chat_add_new_message()");
            } else {
                console.log("RESULT INSERT NEW MESSAGE");
                sqlite_chat_print_all("olab_chat_history");
                callback({
                    status: "ok"
                });
            }
        });
    });
    stmt.finalize();
    db.close();
}
/*####################### END SQLITE3 FUNCTIONS ########################*/


/*####################### START CONFIG VARS ########################*/
//REQUERIMENTS APP
var express = require("express");
var basicAuth = require('basic-auth');
var bodyParser = require('body-parser');
var session = require('cookie-session');
//VARS CONFIG APP
var os = require('os');
var app = express();
var server_port = 3000;
var server_ip_address = "192.168.1.107";//"198.61.147.96";
//FOR BACK-END
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
//FOR FRONT-END
app.set('views', __dirname + '/tpl');
app.use(express.static(__dirname + '/public'));
//MIDDLEWARES INIT
app.use(bodyParser());
app.use(session({
    keys: ['keyolaba', 'keyolabb'],
    secureProxy: false // if you do SSL outside of node
}));
/*####################### END CONFIG VARS ########################*/





/*############################  START AUTH  #####################################*/

var auth = function (req, res, next) {
    function unauthorized(res) {
        console.log("unauthorized");
        return res.render('page_agent_session');
    };
    //post data user
    user_name = req.body.user_name;
    user_pass = req.body.user_pass;
    var user = req.session.user;
    //test width post data
    if (user_name === 'olab' && user_pass === 'olab2014') {
        console.log("1 - ok");
        console.log(user);
        req.session = {
            user: {
                user_name: user_name,
                user_pass: user_pass
            }
        };
        return next();
    } else if (!user || !user.user_name || !user.user_pass) {
        console.log("2");
        return unauthorized(res);
    } else if (user.user_name === 'olab' && user.user_pass === 'olab2014') {
        //check session vars
        console.log("3 - ok");
        console.log(user);
        req.session = {
            user: {
                user_name: user.user_name,
                user_pass: user.user_pass
            }
        };
        return next();
    } else {
        console.log("4");
        return unauthorized(res);
    }
};


var router = express.Router();
// home page route (http://localhost:8080)
router.get('/', auth, function (req, res) {
    res.render("page_agent", {
        server_ip_address: "http://" + server_ip_address + ":" + server_port,
        data: req
    });
});
// chat agent with auth get
router.get('/olab_chat_agent', auth, function (req, res) {
    //res.send('olab_chat_agent!');	
    res.render("page_agent", {
        server_ip_address: "http://" + server_ip_address + ":" + server_port,
        data: req
    });
});
// chat agent with auth post
router.post('/', auth, function (req, res) {
    //res.send('olab_chat_client post!');	
    res.render("page_agent", {
        server_ip_address: "http://" + server_ip_address + ":" + server_port,
        data: req
    });
});
// chat client without auth
router.get('/olab_chat_client', function (req, res) {
    //res.send('olab_chat_client!');	
    res.render("page_client", {
        server_ip_address: "http://" + server_ip_address + ":" + server_port
    });
});
// apply the routes to our application 
app.use('/', router);


/*############################  END AUTH  #####################################*/




//APP LISTENNER SOCKET.IO
var io = require('socket.io').listen(app.listen(server_port));
//VARS TO HANDLER CLIENTS CONNECTED
var agents_ids_assoc_clients = [];
var total_agents = 0;
var max_clients_by_agents = 10;

//CONNETION HANDLER
io.sockets.on('connection', function (socket) {
    //SENT A FIRST MESSAGE
    //socket.emit('message',{ message: "CHAT CONNECTED","id_socket_client":socket.id,"connected":socket.manager.connected,name:"G4A" });
    //HANDLER RECEIVED MESSAGES
    socket.on('send', function (data) {
        //LOOP TO SENT MESSAGES
        for (i = 0; client_id = data.ids[i]; i++) {
            io.sockets.socket(client_id).emit('message', {
                message: data.message,
                connected: socket.manager.connected,
                who: socket.id,
                name: data.name,
                type: "right"
            });
        }
        io.sockets.socket(socket.id).emit('message', {
            message: data.message,
            "connected": socket.manager.connected,
            "who": data.ids,
            name: data.name,
            type: "left"
        });
        obj = get_ids_fron_email_given("_", data.ids);
        if (obj.client_or_agent == 'client') {
            console.log("agent->client");
            //{ ak: 0, ok: 'client_id_0', client_or_agent: 'client' }
            client_email = (agents_ids_assoc_clients[obj.ak])[obj.ok].client_email;
            sqlite_chat_add_new_message({
                email_agent: data.email,
                email_client: client_email,
                email_from: data.email,
                message: data.message
            }, function (data) {
                console.log("saved");
            });
        } else {
            console.log("client->agent");
            //{ ak: 0, ok: '', client_or_agent: 'agent' }
            agent_email = (agents_ids_assoc_clients[obj.ak]).agent_email;
            sqlite_chat_add_new_message({
                email_agent: agent_email,
                email_client: data.email,
                email_from: data.email,
                message: data.message
            }, function (data) {
                console.log("saved");
            });
        }
        console.log("SEND - MESSAGE END");
    });
    //VALID IF IS AGENT OR CLIENT - ONLY ADMINS SHOULD SENT THIS TYPE OF MESSAGE
    socket.on('type_user', function (data) {
        if (data.message == "agent")
            chat_add_agent(socket.id, data);
        else if (data.message == "client")
            chat_add_client(socket.id, data);
    });
    //MESSAGE FOR DISCONNECT
    socket.on('disc', function (data) {
        id_client = data.id;
        email_client = data.email;
        //console.log("PETICION DESCONECTAR==="+id_client+"---"+email_client);
        chat_disconnect_client(email_client);
    });

    socket.on('disc_client', function (data) {
        chat_send_message_for_disc_to_client(data.client_id);
    });

    //LISTENERS
    //SART - SOCKET - HANDLER
    socket.on('connecting', function () {
        console.log('connecting:');
    });
    socket.on('connect', function () {
        //this_socket_id = socket.socket.sessionid;
        console.log('connect:');
    });
    socket.on('connect_failed', function () {
        console.log("connect_failed");
    });
    socket.on('reconnect_failed', function () {
        console.log("Client reconnect_failed");
    });
    socket.on('reconnecting', function () {
        console.log("reconnecting");
    });
    socket.on('reconnect', function () {
        console.log("reconnect");
    });
    socket.on('disconnect', function () {
        id_client_disconnect = socket.id;
        console.log("START disconnect SE DESCONECTO=" + id_client_disconnect);
        //search by this id and send message to other client
        obj_client = get_ids_fron_email_given("_", id_client_disconnect);
        console.log("disconnect RESULTADO");
        console.log(obj_client);
        //si es agente manda mensaje a todos sus clientes para que se desconecten
        //si es cliente se le manda mensaje al agente para que cierre la ventana
        if (obj_client != false && typeof obj_client !== 'undefined') {
            //GET IDS  { ak: 0, ok: 'client_id_0', client_or_agent: 'client' }
            //console.log( (agents_ids_assoc_clients[obj_client.ak]) );
            agent_id = agents_ids_assoc_clients[obj_client.ak].agend_id;
            who_is = obj_client.client_or_agent;
            //console.log( "who_is:"+who_is+"--AID:"+agent_id+"--CID:"+client_id );
            //SEND MESSAGES
            if (who_is == "client") {

                client_id = (agents_ids_assoc_clients[obj_client.ak])[obj_client.ok].client_id;
                (agents_ids_assoc_clients[obj_client.ak])[obj_client.ok].client_id = "";
                io.sockets.socket(agent_id).emit('message', {
                    message_disc: "ESTE USUARIO SE DESCONECTO...",
                    "who": client_id,
                    name: "",
                    type: "right"
                });

            } else {
                //for agent. for each client send message and delete from array
                //console.log("AGENTE SE FUE! : "+id_client_disconnect+" pos:"+obj_client.ak);
                obj = agents_ids_assoc_clients[obj_client.ak];
                //send message for disconnection to the clients
                for (var e in obj) {
                    if (typeof agent_element[e].client_id !== 'undefined') {
                        //console.log(agent_element[e].client_id);
                        io.sockets.socket(agent_element[e].client_id).emit('message', {
                            message_disc: "SE HA PERDIDO LA CONEXION!",
                            type: "right"
                        });
                    }
                }
                console.log("#######REMOVE AGENT#########");
                console.log(agents_ids_assoc_clients);
                //remove Agent from array
                delete agents_ids_assoc_clients[obj_client.ak];
                total_agents = total_agents - 1;

                console.log(agents_ids_assoc_clients);
                console.log("#######REMOVE AGENT#########");
                console.log(" END AGENTE SE FUE!");
            }
        }

    });

});

function chat_send_message_for_disc_to_client(this_client_id) {
    obj_client = get_ids_fron_email_given("_", this_client_id);
    if (obj_client != false && typeof obj_client !== 'undefined') {
        agent_id = agents_ids_assoc_clients[obj_client.ak].agend_id;
        who_is = obj_client.client_or_agent;
        if (who_is == "client") {
            client_id = (agents_ids_assoc_clients[obj_client.ak])[obj_client.ok].client_id;
            (agents_ids_assoc_clients[obj_client.ak])[obj_client.ok].client_id = "";
            io.sockets.socket(this_client_id).emit('message', {
                message_disc: "SE HA PERDIDO LA CONEXION!",
                type: "right"
            });
        }
    }
}

//FUNCTIONS HANDLER AGENTS AND CLIENTS
function chat_add_agent(id, data) {
    //check if not exist actually
    exist_agent = 0;
    for (k in agents_ids_assoc_clients) {

        if (typeof agents_ids_assoc_clients[k] !== 'undefined') {

            if (agents_ids_assoc_clients[k].agent_email == data.email) {
                console.log("Este agente ya existe");
                //send message to the new agent telling that the current email has been used actually
                io.sockets.socket(id).emit('message', {
                    "status": "Este correo ya esta en uso."
                }); //To Agent
                exist_agent = 1;
            }
        }
    }
    if (!exist_agent) {
        object_clients = {
            agend_id: id,
            agent_name: data.name,
            agent_email: data.email
        };
        for (i = 0; i < max_clients_by_agents; i++)
            object_clients["client_id_" + i] = {
                client_id: "",
                client_name: "",
                client_email: ""
            };
        agents_ids_assoc_clients[total_agents++] = object_clients;
        //console.log(agents_ids_assoc_clients);
        io.sockets.socket(id).emit('message', {
            "assoc": "ok"
        }); //To Agent
    }
}

//ASSOC CLIENT TO AGENT MAX 2 BY AGENT
function chat_add_client(id, data) {
    console.log("#######chat_add_client#########");
    console.log(agents_ids_assoc_clients);
    console.log("#######chat_add_client#########");
    //shuffle Arrayagents_ids_assoc_clients
    agents_ids_assoc_clients = shuffle(agents_ids_assoc_clients);
    //check first if exists
    /* solucion facil: encontrar el cliente duplicado, eliminarlo y volver a asignarle un nuevo agente */
    /* solucion dificil: encontrar el cliente duplicado y enviarle el id del agente que tenia asociado anteriormente, pero antes verificar si esta online */

    //CHECK IF THE CLIENTE EXISTS ALREADY
    chat_disconnect_client(data.email);
    //ASSOC WITH NEW AGENT
    agent_id_assoc = "";
    agent_name_assoc = "";
    if (total_agents > 0) {
        assoc_client = false;
        //ASSOC CLIENT ID TO THE FIRST NULL AGENT
        for (var i = 0; i < total_agents; i++) {
            agent_element = agents_ids_assoc_clients[i];
            if (typeof agent_element !== 'undefined') {

                agent_id_assoc = agents_ids_assoc_clients[i].agend_id;
                agent_name_assoc = agents_ids_assoc_clients[i].agent_name;
                for (var e in agent_element) {
                    if (agent_element[e].client_id == "") {
                        agent_element[e].client_id = id;
                        agent_element[e].client_name = data.name;
                        agent_element[e].client_email = data.email;
                        assoc_client = true;
                        break;
                    }
                }
                if (assoc_client)
                    break;
            }
        }
        if (assoc_client) {
            //RESPONDE TO CLIENT TO ADD ID AGENT AND ONLY SENT MESSAGE TO THIS
            io.sockets.socket(id).emit('message', {
                "agent_assoc_id": agent_id_assoc,
                name: agent_name_assoc
            }); //To Client
            io.sockets.socket(agent_id_assoc).emit('message', {
                "client_assoc_id": id,
                name: data.name
            }); //To Agent
        } else {
            console.log("NO HAY AGENTES DISPONIBLES");
            io.sockets.socket(id).emit('message', {
                "agent_assoc_id": "-",
                name: "-"
            }); //To Client
        }
    } else {
        console.log("NO HAY AGENTES DISPONIBLES");
        io.sockets.socket(id).emit('message', {
            "agent_assoc_id": "-",
            name: "-"
        }); //To Client
    }

}

function shuffle(arr) {
    for (var j, x, i = arr.length; i; j = parseInt(Math.random() * i, 10), x = arr[--i], arr[i] = arr[j], arr[j] = x) {}
    return arr;
}

//FUNCTION RETURN OBJECT WITH PARAMETERS, DUPLICATED EMAIL, FIND ID GIVEN A EMAIL, AND RE-RELATION CLIENT WITH AGENT
function get_ids_fron_email_given(email, id) {
    client_email = "";
    client_name = "";
    client_id = "";
    agent_name = "";
    agent_id = "";
    array_key = "";
    object_key = "";
    agent_or_client_assoc = "";

    if (total_agents > 0) {
        assoc_client = false;
        //ASSOC CLIENT ID TO THE FIRST NULL AGENT
        for (var i = 0; i < total_agents; i++) {
            array_key = i;
            agent_element = agents_ids_assoc_clients[i];
            if (typeof agent_element !== 'undefined') {
                agent_id = agents_ids_assoc_clients[i].agend_id;
                agent_name = agents_ids_assoc_clients[i].agent_name;
                if (agent_id == id) {
                    //find agent
                    agent_or_client_assoc = "agent";
                    assoc_client = true;
                    break;
                }
                for (var e in agent_element) {
                    if (agent_element[e].client_email == email || agent_element[e].client_id == id) {
                        object_key = e;
                        client_email = agent_element[e].client_email;
                        client_name = agent_element[e].client_name;
                        client_id = agent_element[e].client_id;
                        agent_or_client_assoc = "client";
                        assoc_client = true;
                        break;
                    }
                }
                if (assoc_client)
                    break;
            } else {
                console.log("------------------------AGENTE UNDEFINED " + id + "------------------------");
            }
        }
        if (assoc_client) {
            if (agent_or_client_assoc != "")
                return {
                    ak: array_key,
                    ok: object_key,
                    client_or_agent: agent_or_client_assoc
                };
            else
                return {
                    ak: array_key,
                    ok: object_key
                };
        } else
            return false;
    }
}

//DISCONNECT CLIENTS AND SEND IT MESSAGE
function chat_disconnect_client(email_client) {
    obj_client = get_ids_fron_email_given(email_client, "_");
    if (obj_client != false && typeof obj_client !== 'undefined') {
        //GET IDS
        console.log((agents_ids_assoc_clients[obj_client.ak]));
        client_id = (agents_ids_assoc_clients[obj_client.ak])[obj_client.ok].client_id;
        agent_id = agents_ids_assoc_clients[obj_client.ak].agend_id;
        //FREE SPACE ON AGENT OBJECT
        //console.log( (agents_ids_assoc_clients[obj_client.ak])[obj_client.ok]  );
        (agents_ids_assoc_clients[obj_client.ak])[obj_client.ok].client_id = ""
        //console.log( (agents_ids_assoc_clients[obj_client.ak])[obj_client.ok]  );
        //SEND MESSAGE FOR CLOSE CONNETION SOCKET TO CLIENT AND AGENT ASSOC  
        io.sockets.socket(client_id).emit('message', {
            disc: "disc"
        }); //To Client
        io.sockets.socket(agent_id).emit('message', {
            disc: client_id
        }); //To Agent
    }
}
console.log("IP ADDRESS:" + server_ip_address + "   PORT:" + server_port + "   INIT: " + timestamp('DD-MM-YYYY hh:mm:ss'));