extends Node

# SoundManager.gd - Autoload Singleton
# Manages audio playback with support for pitch shifting and Shepard tones.

var sounds = {
	"START_GAME": preload("res://assets/sounds/start_game.mp3"),
	"PETAL_HOVER": preload("res://assets/sounds/petal_hover.mp3"),
	"PETAL_CLICK": preload("res://assets/sounds/petal_click.mp3"),
	"PETAL_POP": preload("res://assets/sounds/petal_pop.mp3"),
	"SUSPENSE_WOBBLE": preload("res://assets/sounds/suspense_wobble.mp3"),
	"LEVEL_UP": preload("res://assets/sounds/level_up.mp3"),
	"GAME_OVER": preload("res://assets/sounds/game_over.mp3")
}

func play(sound_name: String, volume: float = 0.5, pitch: float = 1.0):
	if not sounds.has(sound_name):
		push_error("Sound not found: " + sound_name)
		return
		
	var player = AudioStreamPlayer.new()
	add_child(player)
	player.stream = sounds[sound_name]
	player.volume_db = linear_to_db(volume)
	player.pitch_scale = pitch
	player.play()
	player.finished.connect(player.queue_free)

func play_loop(sound_name: String, volume: float = 0.5) -> AudioStreamPlayer:
	if not sounds.has(sound_name):
		push_error("Sound not found: " + sound_name)
		return null
		
	var player = AudioStreamPlayer.new()
	add_child(player)
	player.stream = sounds[sound_name]
	player.volume_db = linear_to_db(volume)
	# For mp3 files, we can't easily set loop at runtime in Godot 4 without re-import settings
	# but we can connect the finished signal to play again.
	player.finished.connect(player.play)
	player.play()
	return player

func play_shepard(sound_name: String, level: int, base_volume: float = 0.5):
	var steps_per_octave = 12.0
	var offset = fmod(float(level), steps_per_octave) / steps_per_octave
	
	# Voice A: 1.0 -> 2.0 (High octave)
	# Voice B: 0.5 -> 1.0 (Low octave)
	var rate_a = pow(2.0, offset)
	var rate_b = pow(2.0, offset - 1.0)

	# Volume curves: Sine-based crossfade
	var vol_a = 0.5 * (1.0 + cos(offset * PI))
	var vol_b = 0.5 * (1.0 + cos((offset - 1.0) * PI))

	play(sound_name, base_volume * vol_a, rate_a)
	play(sound_name, base_volume * vol_b, rate_b)

func linear_to_db(linear: float) -> float:
	if linear == 0:
		return -80.0
	return 20.0 * log(linear) / log(10.0)
