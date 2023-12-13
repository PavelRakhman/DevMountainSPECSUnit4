require("dotenv").config()
const port = process.env.PORT
const express = require("express")
const axios = require("axios")
const cors = require("cors")
const jwt = require("jsonwebtoken")
const {Sequelize, DataTypes, HasMany} = require("sequelize")

const app = express()
app.use(express.json())
app.use(cors())

const sequelize = new Sequelize("postdb", "root", "CromFeyr198862!",

{
host:"localhost",
port:3306,
dialect:"mysql"
})

//all Users and allPosts are two global array which will be filled with objects every 
let allUsers =[]
let allPosts =[]
let isAuthentiacted = false
let matchingProfileFound = false

//-------------------------USER Table--------------------------------------//

const User = sequelize.define('users', 
{
user_id:{type:DataTypes.INTEGER, allowNull:false, primaryKey:true, autoIncrement:true},
username:{type:DataTypes.STRING, allowNull:false},
password:{type:DataTypes.STRING, allowNull:false}
}, {autoIncrement:true, freezeTableName:true, timeStamps:false})


//------------------------------------------POSTSTable------------------------//
const Post = sequelize.define('posts', 
{
title:{type:DataTypes.STRING},
    body:{type:DataTypes.STRING},
}, {timestamps:false, freezeTableName:true})

//-----------------------ASSOCIACIONS-----------------------------------------//

async function createAssociacions()
{
    User.hasMany(Post)
    Post.belongsTo(User)
    await sequelize.sync({alter:true})
console.log("Associations created successfully")
await getAllUsers()
await getAllPosts()
console.log('--------------------------USERS-----------------------')
console.log(allUsers)
console.log('--------------------------ALL POSTS--------------------')
console.log(allPosts)
}

//---------------------------------------------------------CREATE USER INSTANCE---------------------------------------

async function createUserInstnance(username, password)
{
 await User.sync({alter:true})
 const newUser = await User.create(
    {
        username: username,
        password:password    
    }    
    )    
}

 async function createPost(post)
{
    let title = post.title
    let body = post.body

await Post.sync({alter:true})
const newPost = await Post.create(
{
    title:title,
    body:body
}
)
await getAllPosts() 
}

async function deletePost(postData)
{
    await Post.destroy({where:{body:postData.body}})

}
//------------------------------HELPER FUNCTIONS--------------------------
//------------------------------GET ALL USERS-----------------------------

async function getAllUsers()
{
    allUsers=[]
    await sequelize.sync()
    let users = await User.findAll()
    users.forEach(user=>{allUsers.push(user.toJSON())})
}

async function getAllPosts()
{
    allPosts = []
    await sequelize.sync()
    let posts = await Post.findAll()
    
        posts.forEach(post=>{allPosts.push(post.toJSON())})
    
    
}



//endpoints


app.get('/allUsers',async (req,res)=>{
try
{
    await getAllUsers()
    res.status(200).send(allUsers)
}

catch{res.status(500).send("Error")}    
})

app.get('/allPosts', async(req, res)=>{

try{
    await getAllPosts()
    res.status(200).send(allPosts)
}

catch{res.status(500).send("Server error")}
    

})

app.post('/register', async(req,res)=>{
try
{
    let currentUserName = await req.body.username
let currentPassword = await req.body.password
res.status(200).send(`The newly added user is ${currentUserName} ${currentPassword}`)
await createUserInstnance(currentUserName, currentPassword)

}

catch
{
    res.status(500).send('Error')
}
    
})


//authentication middleware

function authenticateUser(req,res,next)
{
let authorization = req.headers['authorization']
let token = authorization.split(' ')[1]
console.log(token)    
}


function UserAuthentication(username, password)
{
 //key variables: username, password, and an array of user profiles
 //The function loops through the array and finds an object whose username-propert and password-property match the arguments passed into the function
 //The function returns a matching profile
 let matchingProfile =[]
 let currentUserObject ={username:username, password:password}
for (let i=0; i< allUsers.length;i++)
{
    if((allUsers[i].username===currentUserObject.username) && (allUsers[i].password===currentUserObject.password))
    {
    matchingProfile.push(currentUserObject)    
    }
}
return matchingProfile[0]
}



app.post('/login', async (req,res)=>{
try
{
  //AuthenticateUser
const requestDataUsername = await req.body.username
console.log(`The username you are loggin in with is ${requestDataUsername}`)
const requestDataPassword = await req.body.password
console.log(`The password you are logging in with is ${requestDataPassword}`)
const matchingProfile =UserAuthentication(requestDataUsername, requestDataPassword)
if (matchingProfile) {matchingProfileFound = true}
else {matchingProfileFound=false}

const requestDataUser = {username:requestDataUsername, password:requestDataPassword}
const accessToken = jwt.sign(requestDataUser, process.env.ACCESS_TOKEN_SECRET)
console.log(accessToken)
const response = {accessToken:accessToken, MPF:matchingProfileFound}
res.status(200).send(response)
}



catch
{
    res.status(500).send("Error")
}
})

//middleware that authenticates the token

async function getUserID(username)
{
    await sequelize.sync({alter:true})
    let targetUser = await User.findOne({where:{username:username}})
    console.log(targetUser.toJSON().user_id)
}

function authenticateToken (req,res,next)
{
    const authorization = req.headers['authorization']
    const token = authorization.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error,user)=>{
if(error)
{
isAuthentiacted = false
console.log(isAuthentiacted)    
}
else
{
    isAuthentiacted=true
    req.user= user
    next()
}
    })   
}

app.get("/login", authenticateToken, (req,res)=>{
    try{
const authenticatedUser = {
    username:req.user.username,
    password:req.user.password,
    authenticated: isAuthentiacted
}
res.status(200).send(authenticatedUser)
       

    }

    catch{
        res.status(500).send("Error")
    }
})

app.get("/posts", async (req, res)=>{
try{
    res.status(200).send(allPosts)
    console.log(allPosts)
}
catch{res.status(500).send("Error")}
})


//-----------------------------------------------CRUD endpoints------------------------------------

app.post("/deletePost", async(req,res)=>{
try{
let receivedData = await req.body
await deletePost(await receivedData)
await getAllPosts()
res.status(200).send("Delete post request received")
}

catch{res.status(500).send("Error")}    
})


app.post("/addpost", async(req,res)=>{
try{
//
let title = await req.body.title
let body = await req.body.body
let username = await req.body.username 
await sequelize.sync({alter:true})
let targetUser = await User.findOne({where:{username: username}})
let targetUserObject = await targetUser.toJSON()
await targetUser.createPost(
{title:title,
body:body})
res.status(200).send("Post added")
}


catch{res.status(500).send("Error")}   
})


app.post("/getUserPosts", async(req,res)=>{
try{
let receivedUserName = await req.body.username
await sequelize.sync({alter:true})
let targetUser = await User.findOne({where:{username:receivedUserName}})
let targetUserJSON = await targetUser.toJSON()
console.log(targetUserJSON)
res.status(200).send("Check server console")


}

catch{res.status(500).send("Error")}    
})


app.put("/updatePost", async(req,res)=>{
try{
    res.status(200).send("Put request received")
    let postId = await req.body.postId
let postBody = await req.body.body
console.log(`Received post id: ${postId}`)
console.log(`Received post body: ${postBody}`)

//lets retrieve the post you want to update

let targetPost = await Post.findOne({where:{id:postId}})
targetPost.body = postBody
await targetPost.save()



}
catch{res.status(500).send("Error")}
})









createAssociacions()
app.listen(port, ()=>{console.log(`Server listening on port ${port}`)})
