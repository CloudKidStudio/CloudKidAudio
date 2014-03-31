##2.0.0 (2014-03-31)

- Changed parameters in play() from (alias, onFinish, onUpdate) to (alias, onFinish, onStart, onUpdate), for compatability with cloudkid.Sound.
- play() returns an AudioInst object. You probably don't need to worry about this, but could use it to sync animations.
- Removed AudioAnimation, since that functionality is in cloudkid.Animator, in a better way.
- Added VOPlayer, with a similar feature set to the original in cloudkid.Sound.