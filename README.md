# adt2

Finally, decent channel tools for the common person. ADT is a simple bot which allows you to prevent people from adding others to a private channel and preventing others (protect) from *removing* someone from a private channel.

**N.b.** This only works in *private* channels. There's no point in locking down a *public* channel.


## Wanna demo it?
Add it to a private channel you manage and try the commands!

![](https://files.catbox.moe/5pjqck.png)
> What the user sees when they try to add someone

![](https://files.catbox.moe/abn393.png)
> Check the status of ADT

![](https://files.catbox.moe/sz8aje.png)
> You can "protect" users to prevent them from being kicked.

![](https://files.catbox.moe/nhjeyy.png)
> "Snitch" mode, which tells everyone when you try to add someone while the channel is armed.

## Commands
- `/adtstatus` - Check the status of a channel.
- `/arm` - Prevents everyone from adding others from a channel
- `/snitch` - Publicly "snitches" on anyone attempting to add people to an armed channel
- `/disarm` - Allows anyone to add another to a channel (this is the default for all channel)
- `/protect [user id(s)]` - Prevents the person from being removed from the channel. Also allows the person to enter the channel. Run the command with the same IDs to toggle it off again.


You'll need to authorize ADT first to run in your channels. Visit https://adt.david.hackclub.app/authorize to start.