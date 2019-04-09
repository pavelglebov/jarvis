### Jarvis is quest-bot with easy customizable scenarios

## To run jarvis with default config

```sh
node jarvis
```

## To run with config from other directory

Use `--configPath` and `--config` arguments, e.g.:

```sh
node jarvis --configPath=../jarvis-private-configs/ --config=newyear2019
```

## Mongo

Use `--usedb=true` param to enable logging to Mongo

## Config format

```json
{
	"rounds": [ // scenario rounds
		{
			"output": [ // what Jarvis says when round starts
				{
					"text": "The text jarvis says",
					"timer": 0 // time after previous output
				},
				{
					"text": "What is love?",
					"timer": 2000 // this will be fired 2 seconds after previos one
				}
			],
			"success": ["baby don't hurt me"], // set of values needed finish round and go to the next
			"hints": ["baby..."], //set of hints when user is stuck. Currently reacts only to "подсказка"
			"eggs": { // trigger - reaction for easter eggs just for current round
				"some input": ["some reaction"],
				"what is this": ["This is a song"]
			}
		}
	],
	"easterEggs": { // trigger - reaction, global level (for all rounds)
		"hi": ["hello"],
		"ping": ["pong", "/img/someimage.jpg"]
	},
	"jarvis": ["response1", "response2"] // reactions to word 'jarvis'
}
```

## Default voice language is ru-RU, can be changed in client.js