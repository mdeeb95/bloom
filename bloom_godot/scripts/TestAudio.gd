extends Node

func _ready():
	print("--- Testing Audio ---")
	if has_node("/root/SoundManager"):
		print("SoundManager Autoload found.")
		SoundManager.play("START_GAME")
		print("Played START_GAME")
		await get_tree().create_timer(1.0).timeout
		SoundManager.play("PETAL_POP", 0.5, 1.2)
		print("Played PETAL_POP with pitch 1.2")
		await get_tree().create_timer(1.0).timeout
		print("Audio test sequence complete.")
		get_tree().quit()
	else:
		push_error("SoundManager Autoload NOT found!")
		get_tree().quit(1)
