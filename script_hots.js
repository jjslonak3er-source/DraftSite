const pool = document.getElementById("championPool")
const search = document.getElementById("search")
const recommendBtn = document.getElementById("recommendBtn")

let draggedChampion = null
let usedChampions = new Set()

let pairingLookup = {}
let matchupLookup = {}

let roleScores = {}
let roleLookup = {}
let statScores = {}
let statLookup = {}
let blindLookup = {}
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

pairingLookup = await fetch("hotspairings.json").then(r=>r.json())
matchupLookup = await fetch("hotsmatchups.json").then(r=>r.json())
roleScores = await fetch("hotsroles.json").then(r=>r.json())

const roles = await fetch("hotsroles.json").then(r=>r.json())
const stats = await fetch("herovalues.json").then(r=>r.json())
const blind = await fetch("hotsblindable.json").then(r=>r.json())


roles.forEach(r => {

  roleLookup[r["Hero Name"]] = {
    Tank: r.Tank,
    RangedDPS: r.RangedDPS,
    Healer: r.Healer,
    Flex: r.Flex,
    Offlane: r.Offlane
  }

})

stats.forEach(r => {

  statLookup[r["Hero Name"]] = {
    Engage: r.Engage,
    Peel: r.RangedDPS,
    Waveclear: r.Waveclear,
    TeamSustain: r.TeamSustain,
    SelfSustain: r.SelfSustain
  }

})

blind.forEach(r => {
  blindLookup[r["Hero Name"]] = {
    Blindable: r.Blindable
  }
})



console.log("Pairings loaded:",Object.keys(pairingLookup).length)
console.log("Matchups loaded:",Object.keys(matchupLookup).length)

}

function roleFilter(champ){

if(!activeRole) return true

let score = roleLookup[champ.name]?.[activeRole] ?? 0

return score >= 4

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
.filter(c=>c !== "Cho" && c !== "Gall")

let results = []

tank_role_target = 9.75
dps_role_target = 11
support_role_target = 8.25
flex_role_target = 12
offlane_role_target = 10

for(let champ of blue){

    let tank_role_weight = roleLookup[champ]?.Tank ?? 1
    let dps_role_weight = roleLookup[champ]?.RangedDPS ?? 1
    let support_role_weight = roleLookup[champ]?.Healer ?? 1
    let flex_role_weight = roleLookup[champ]?.Flex ?? 1
    let offlane_role_weight = roleLookup[champ]?.Offlane ?? 1

    tank_role_target -= tank_role_weight
    dps_role_target -= dps_role_weight
    support_role_target -= support_role_weight
    flex_role_target -= flex_role_weight
    offlane_role_target -= offlane_role_weight
}

all_weights = [tank_role_target, dps_role_target, support_role_target, flex_role_target, offlane_role_target]
min_weight = Math.min(...all_weights)
max_weight = Math.max(...all_weights)

eps = 0.001
floor = 0.1

final_tank_value = ((tank_role_target - min_weight + eps) / (max_weight - min_weight + eps)) * (1 - floor) + floor
final_dps_value = ((dps_role_target - min_weight + eps) / (max_weight - min_weight + eps)) * (1 - floor) + floor
final_support_value = ((support_role_target - min_weight + eps) / (max_weight - min_weight + eps)) * (1 - floor) + floor
final_flex_value = ((flex_role_target - min_weight + eps) / (max_weight - min_weight + eps)) * (1 - floor) + floor
final_offlane_value = ((offlane_role_target - min_weight + eps) / (max_weight - min_weight + eps)) * (1 - floor) + floor

/*
Engage peel waveclear sustain  
*/
engage_target = 20
peel_target = 18
waveclear_target = 25
sustain_target = 16


for(let champ of blue){

    let engage_weight = statLookup[champ]?.Engage?? 1
    let peel_weight = statLookup[champ]?.Peel ?? 1
    let waveclear_weight = statLookup[champ]?.WaveClear ?? 1
    let team_sustain_weight = statLookup[champ]?.TeamSustain ?? 1
    let self_sustain_weight = statLookup[champ]?.SelfSustain ?? 1

    engage_target -= engage_weight
    peel_target -= peel_weight
    waveclear_target -= waveclear_weight
    sustain_target -= (team_sustain_weight + self_sustain_weight/4)
}

stat_weights = [engage_target, peel_target, waveclear_target, sustain_target]
stat_min_weight = Math.min(...stat_weights)
stat_max_weight = Math.max(...stat_weights)

eps = 0.001
floor = 0.5

final_engage_value = ((engage_target - stat_min_weight + eps) / (stat_max_weight - stat_min_weight + eps)) * (2 - floor) + floor
final_peel_value = ((peel_target - stat_min_weight + eps) / (stat_max_weight - stat_min_weight + eps)) * (2 - floor) + floor
final_waveclear_value = ((waveclear_target - stat_min_weight + eps) / (stat_max_weight - stat_min_weight + eps)) * (2 - floor) + floor
final_sustain_value = ((sustain_target - stat_min_weight + eps) / (stat_max_weight - stat_min_weight + eps)) * (2 - floor) + floor



for(let champ of available){

let testBlue=[...blue,champ]

let pairScore=teamPairScore(testBlue)
let matchScore=matchupScore(testBlue,red)

/* weighted score */
let champ_tank = roleLookup[champ]?.Tank ?? 1
let champ_dps = roleLookup[champ]?.RangedDPS ?? 1
let champ_support = roleLookup[champ]?.Healer ?? 1
let champ_flex = roleLookup[champ]?.Flex ?? 1
let champ_offlane = roleLookup[champ]?.Offlane ?? 1

let champ_tank_adjusted = champ_tank * final_tank_value
let champ_dps_adjusted = champ_dps * final_dps_value
let champ_support_adjusted = champ_support * final_support_value
let champ_flex_adjusted = champ_flex * final_flex_value
let champ_offlane_adjusted = champ_offlane * final_offlane_value

let champ_engage = statLookup[champ]?.Engage ?? 1
let champ_peel = statLookup[champ]?.Peel ?? 1
let champ_waveclear = statLookup[champ]?.WaveClear ?? 1
let champ_team_sustain = statLookup[champ]?.TeamSustain ?? 1
let champ_self_sustain = statLookup[champ]?.SelfSustain ?? 1
let champ_sustain = champ_team_sustain + champ_self_sustain/4

let champ_engage_adjusted = champ_engage * final_engage_value
let champ_peel_adjusted = champ_peel * final_peel_value
let champ_waveclear_adjusted = champ_waveclear * final_waveclear_value
let champ_sustain_adjusted = champ_sustain * final_sustain_value


let blueCount = blue.length()
let redCount = red.length()
let totalCount = blueCount + redCount


let blindable = blindLookup[champ]?.Blindable ?? 0

if(totalCount > 3){
  blindable = 1
} 

let role_score = champ_tank_adjusted + champ_dps_adjusted + champ_support_adjusted + champ_flex_adjusted + champ_offlane_adjusted
let stat_score = champ_engage_adjusted + champ_peel_adjusted + champ_waveclear_adjusted + champ_sustain_adjusted

let score = (((pairScore + matchScore)^2)/100) * role_score * stat_score * blindable

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












const botBtn = document.getElementById("botPick")

if(botBtn){
botBtn.addEventListener("click",()=>{

let blue = getTeam("b")
let red = getTeam("r")

if(red.length >= 5) return
/* get recommendations for red side */

let results = recommendPick(red, blue)

if(results.length === 0) return

/* take top 5 */

let top5 = results.slice(0,3)

/* random pick */

let choice = top5[Math.floor(Math.random()*top5.length)]

let champName = choice[0]

let champ = champions.find(c=>c.name === champName)

if(!champ) return

/* find next empty red slot */

for(let i=1;i<=5;i++){

let slot = document.getElementById("r"+i)

if(!slot.dataset.champion){

slot.dataset.champion = champ.name
usedChampions.add(champ.name)

slot.innerHTML = `
<img src="${champ.icon}">
<div class="champ-name">${champ.name}</div>
`

break
}

}

/* refresh UI */

loadChampions(filterChampions())
updateRecommendations()
updateDraftWinChance()

})

}






