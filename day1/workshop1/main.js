import express from 'express'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

// hack 
import range from './node_modules/express-range/index.js'

import { 
	findAllGames, findGamesByName, findGameById, countGames, 
	findCommentsByGameId, findCommentsByUser, findCommentById,
	insertComment
} from './database.js'
import { mkGameUrl, mkCommentUrl, mkError } from './util.js'

const PORT = parseInt(process.env.PORT) || 3000

const app = express()

app.use(morgan("common"))
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// Games
// TODO GET /games
app.get('/games', async (req, resp) => {
	const offset = parseInt(req.query.offset) || 0
	const limit = parseInt(req.query.limit) || 10
	
	try {
		const result = await findAllGames(offset, limit)
		resp.status(200)
		resp.json(result.map(r => `/game/${r.id}`))
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})

// TODO GET /game/<game_id>
app.get('/game/:gameId', async (req, resp) => {
	const gameId = parseInt(req.params.gameId)
	try {
		const result = await findGameById(gameId)
		if(result) {
			resp.status(200)
			const contentType = req.get('Content-Type')
			if(contentType === 'text/csv') {
				let output = `id,name,year,ranking,users_rated,url,image\n`
				output += Object.values(result).join(',')
				resp.send(output)
			} else if(contentType === 'application/json') {
				resp.json(result)
			} else {
				resp.status(415)
				resp.json(mkError(`Media ${req.get('Content-Type')} is not supported`))
			}
			
		} else {
			resp.status(404)
			resp.json(mkError(`Game ${gameId} not found`))
		}
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})

app.get('/games/search', async (req, resp) => {
	const q = req.query.q
	if (!q) 
		return resp.status(400).json({ error: `Missing query parameter q` })
	
	try {
		const result = await findGamesByName(q)
		resp.status(200)
		resp.json(mkGameUrl(result))
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})

app.get('/games/count', async (req, resp) => {
	try {
		const result = await countGames()
		resp.status(200)
		resp.json({ count: result })
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})

// Comments
// TODO POST /comment
app.post('/comment', async (req, resp) => {
	const user = req.body.user
	const rating = parseInt(req.body.rating)
	const c_text = req.body.c_text
	const gid = req.body.gid;
	let proceed = true
	if(!user || isNaN(rating) || !c_text || !gid) {
		resp.status(400)
		resp.json(mkError(`Missing parameter`))
		proceed = false
	} else if(rating < 1 || rating > 10) {
		resp.status(400)
		resp.json(mkError(`Invalid rating, allowed range 0 - 10`))
		proceed = false
	} else if(typeof c_text !== 'string') {
		resp.status(400)
		resp.json(mkError(`Invalid comments`))
	} else if(typeof c_text === 'string' && c_text.trim().length === 0) {
		resp.status(400)
		resp.json(mkError(`Comments cannot be empty`))
		proceed = false
	} else if(!await findGameById(gid)) {
		resp.status(400)
		resp.json(mkError(`Game ${gid} not found`))
		proceed = false
	}

	// Stop processing once any error occurred
	if(!proceed) return

	try {
		const result = await insertComment(c_text)
		resp.status(200)
		resp.json({id: result})
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})

app.get('/game/:gameId/comments', async (req, resp) => {
	const gameId = parseInt(req.params.gameId)
	const offset = parseInt(req.query.offset) || 0
	const limit = parseInt(req.query.limit) || 10
	try {
		const result = await findCommentsByGameId(gameId, offset, limit)
		resp.status(200)
		resp.json(mkCommentUrl(result))
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})

app.get('/comments/:user', async (req, resp) => {
	const user = req.params.user
	const offset = parseInt(req.query.offset) || 0
	const limit = parseInt(req.query.limit) || 10
	try {
		const result = await findCommentsByUser(user, offset, limit)
		resp.status(200)
		resp.json(mkCommentUrl(result))
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})

app.get('/comment/:commentId', async (req, resp) => {
	const commentId = req.params.commentId
	try {
		const comment = await findCommentById(commentId)
		if (!comment) {
			resp.status(404)
			return resp.json(mkError({ error: `Comment ${commentId} not found`}))
		}
		resp.status(200)
		resp.json(comment)
	} catch (err) {
		resp.status(500)
		resp.json(mkError(err))
	}
})

app.listen(PORT, () => {
	console.info(`Application started on port ${PORT} at ${new Date()}`)
})
