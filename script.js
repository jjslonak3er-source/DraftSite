const pool = document.getElementById("championPool")
const search = document.getElementById("search")
const recommendBtn = document.getElementById("recommendBtn")

let draggedChampion = null
let usedChampions = new Set()

let pairingLookup = {}
let matchupLookup = {}

let roleScores = {}
let roleLookup = {}
let activeRole = null

/* -----------------------------
LOAD CHAMPIONS
----------------------------- */

document.querySelectorAll(".role-btn").forEach(btn=>{

btn.addEventListener("click",()=>{

let role = btn.dataset.role

/* toggle */

if(activeRole === role){
activeRole = null
btn.classList.remove("active")
}
else{

activeRole = role

document.querySelectorAll(".role-btn")
.forEach(b=>b.classList.remove("active"))

btn.classList.add("active")

}

/* refresh pool */

loadChampions(filterChampions())

})

})

function loadChampions(list){

pool.innerHTML=""

list.forEach(champ=>{

if(usedChampions.has(champ.name)) return

let card=document.createElement("div")
card.className="champion"
card.draggable=true
card.dataset.champion = champ.name

card.innerHTML=`
<img src="${champ.icon}">
<div>${champ.name}</div>
`

card.addEventListener("dragstart",()=>{
draggedChampion=champ
})

pool.appendChild(card)

})

}

loadChampions(champions)
updateRecommendations()

/* -----------------------------
SEARCH
----------------------------- */

search.oninput=()=>{

let value=search.value.toLowerCase()

let filtered=champions.filter(c=>
c.name.toLowerCase().includes(value)
)

loadChampions(filtered)
updateRecommendations()

}

/* -----------------------------
SLOTS
----------------------------- */

document.querySelectorAll(".slot").forEach(slot=>{

slot.addEventListener("dragover",e=>{
e.preventDefault()
})

slot.addEventListener("drop",()=>{

if(!draggedChampion) return
if(usedChampions.has(draggedChampion.name)) return

slot.dataset.champion=draggedChampion.name
usedChampions.add(draggedChampion.name)

slot.innerHTML=`
<img src="${draggedChampion.icon}">
<div class="champ-name">${draggedChampion.name}</div>
`

loadChampions(filterChampions())
updateRecommendations()
updateDraftWinChance()


})

})

/* -----------------------------
RETURN TO POOL
----------------------------- */

pool.addEventListener("dragover",e=>{
e.preventDefault()
})

pool.addEventListener("drop",()=>{

let champ=draggedChampion?.name
if(!champ) return

document.querySelectorAll(".slot").forEach(slot=>{

if(slot.dataset.champion===champ){

slot.innerHTML=""
slot.dataset.champion=""
usedChampions.delete(champ)

}

})

loadChampions(filterChampions())
updateRecommendations()

})

/* -----------------------------
FILTER
----------------------------- */

function filterChampions(){

let value = search.value.toLowerCase()

return champions.filter(c=>{

if(usedChampions.has(c.name)) return false
if(!c.name.toLowerCase().includes(value)) return false
if(!roleFilter(c)) return false

return true

})

}

/* -----------------------------
LOAD STATS
----------------------------- */

async function loadStats(){

pairingLookup = await fetch("pairings.json").then(r=>r.json())
matchupLookup = await fetch("matchups.json").then(r=>r.json())
roleScores = await fetch("roles.json").then(r=>r.json())

const roles = await fetch("roles.json").then(r=>r.json())


roles.forEach(r=>{
roleLookup[r.champion] = r
})


console.log("Pairings loaded:",Object.keys(pairingLookup).length)
console.log("Matchups loaded:",Object.keys(matchupLookup).length)

}

function roleFilter(champ){

if(!activeRole) return true

let score = roleLookup[champ.name]?.[activeRole] ?? 0


return score >= 25

}


function roleFilterByName(champName){

if(!activeRole) return true

let score = roleLookup[champName]?.[activeRole] ?? 0

return score >= 25

}

/* -----------------------------
PAIRING SCORE
----------------------------- */

function teamPairScore(team){

let score = 0

for(let i=0;i<team.length;i++){
for(let j=i+1;j<team.length;j++){

let key1 = team[i] + "|" + team[j]
let key2 = team[j] + "|" + team[i]

score += pairingLookup[key1] ?? pairingLookup[key2] ?? 0

}}

return score

}

/* -----------------------------
MATCHUP SCORE
----------------------------- */

function matchupScore(blue, red){

let score = 0

for(let b of blue){
for(let r of red){

let key1 = b + "|" + r
let key2 = r + "|" + b

score += matchupLookup[key1] ?? matchupLookup[key2] ?? 0

}}

return score

}

/* -----------------------------
RECOMMEND PICK
----------------------------- */

function recommendPick(blue, red){

if(!pairingLookup || Object.keys(pairingLookup).length===0){
console.log("Stats not loaded yet")
return []
}

let taken = new Set([...blue,...red])

let available = champions
.map(c=>c.name)
.filter(c=>!taken.has(c))

available = available.filter(c=>roleFilterByName(c.name))

let results = []

for(let champ of available){

let testBlue=[...blue,champ]

let pairScore=teamPairScore(testBlue)
let matchScore=matchupScore(testBlue,red)

/* weighted score */

let score = pairScore*1.1 + matchScore*1.4

results.push([champ,score])

}

results.sort((a,b)=>b[1]-a[1])

return results.slice(0,10)

}

/* -----------------------------
GET TEAM
----------------------------- */

function getTeam(prefix){

let team=[]

for(let i=1;i<=5;i++){

let champ=document.getElementById(prefix+i)?.dataset?.champion
if(champ) team.push(champ)

}

return team

}


/* -----------------------------
BUTTON
----------------------------- */

if(recommendBtn){
recommendBtn.addEventListener("click",updateRecommendations)
}




function updateRecommendations(){

let blue = getTeam("b")
let red = getTeam("r")

let results = recommendPick(blue,red)

let panel = document.getElementById("recommendations")

if(!panel) return

panel.innerHTML=""

results.forEach(r=>{

let champ = champions.find(c=>c.name===r[0])

if(!champ) return

let card=document.createElement("div")
card.className="rec-card"

card.innerHTML=`
<img src="${champ.icon}">
<div>${champ.name}</div>
<div class="rec-score">${r[1].toFixed(1)}</div>
`

panel.appendChild(card)

})

}




function updateDraftWinChance(){

let blueChance = draftWinPercent()
let redChance  = 100 - blueChance

document.getElementById("blueWin").style.width = blueChance + "%"
document.getElementById("redWin").style.width  = redChance + "%"

}


function blueMatchupScore(blue, red){

let score = 0

for(let b of blue){
for(let r of red){

let key = b + "|" + r

if(matchupLookup[key] !== undefined){
score += matchupLookup[key]
}

}}

return score
}


function redMatchupScore(blue, red){

let score = 0

for(let r of red){
for(let b of blue){

let key = r + "|" + b

if(matchupLookup[key] !== undefined){
score += matchupLookup[key]
}

}}

return score
}




function evaluateDraft(){

let blue = getTeam("b")
let red  = getTeam("r")

let bluePair = teamPairScore(blue)
let redPair  = teamPairScore(red)

let blueMatch = blueMatchupScore(blue, red)
let redMatch  = redMatchupScore(blue, red)

let blueScore = bluePair + blueMatch
let redScore  = redPair  + redMatch

let total = blueScore - redScore

return total
}



function draftWinPercent(){

let score = evaluateDraft()

let scale = 300   // adjust based on your dataset

let blueChance = 50 + (score / scale) * 50

blueChance = Math.max(5, Math.min(95, blueChance))

return blueChance
}






/* -----------------------------
INIT
----------------------------- */

async function init(){

await loadStats()

console.log("Stats ready")
updateRecommendations()

}

init()



