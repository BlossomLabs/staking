const { assertRevert, assertBn } = require('@1hive/contract-helpers-test/src/asserts')
const { bn, bigExp } = require('@1hive/contract-helpers-test')

const { deploy } = require('../helpers/deploy')(artifacts)
const { approveAndStake, approveStakeAndLock } = require('../helpers/helpers')(artifacts)
const { DEFAULT_STAKE_AMOUNT, DEFAULT_LOCK_AMOUNT, EMPTY_DATA } = require('../helpers/constants')
const { STAKING_ERRORS } = require('../helpers/errors')

contract('Staking app, Locking', ([owner, user1, user2]) => {
  let staking, lockManager

  beforeEach(async () => {
    const deployment = await deploy(owner)
    staking = deployment.staking
    lockManager = deployment.lockManager
  })

  it('allows new manager and locks amount', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    // check lock values
    const { amount, allowance } = await staking.getLock(owner, user1)
    assertBn(amount, DEFAULT_LOCK_AMOUNT, "locked amount should match")
    assertBn(allowance, DEFAULT_LOCK_AMOUNT, "locked allowance should match")

    assertBn(await staking.unlockedBalanceOf(owner), DEFAULT_STAKE_AMOUNT.sub(DEFAULT_LOCK_AMOUNT), "Unlocked balance should match")
    const { staked, locked } = await staking.getBalancesOf(owner)
    assertBn(staked, DEFAULT_STAKE_AMOUNT, "Staked balance should match")
    assertBn(locked, DEFAULT_LOCK_AMOUNT, "Locked balance should match")
  })

  it('fails locking 0 tokens', async () => {
    await approveAndStake({ staking, from: owner })
    await staking.allowManager(user1, 1, EMPTY_DATA)
    await assertRevert(staking.lock(owner, 0, { from: user1 }), STAKING_ERRORS.ERROR_AMOUNT_ZERO)
  })

  it('fails locking without enough allowance', async () => {
    await approveAndStake({ staking, from: owner })
    await staking.allowManager(user1, 1, EMPTY_DATA)
    await assertRevert(staking.lock(owner, 2, { from: user1 }), STAKING_ERRORS.ERROR_NOT_ENOUGH_ALLOWANCE)
  })

  it('fails locking more tokens than staked', async () => {
    await approveAndStake({ staking, from: owner })
    await staking.allowManager(user1, DEFAULT_STAKE_AMOUNT.add(bn(1)), EMPTY_DATA)
    await assertRevert(staking.lock(owner, DEFAULT_STAKE_AMOUNT.add(bn(1)), { from: user1 }), STAKING_ERRORS.ERROR_NOT_ENOUGH_BALANCE)
  })

  it('fails allowing lock manager if already locked', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    await approveAndStake({ staking, from: owner })
    await assertRevert(staking.allowManager(user1, DEFAULT_STAKE_AMOUNT, "0x02"), STAKING_ERRORS.ERROR_LOCK_ALREADY_EXISTS)
  })

  it('fails unstaking locked tokens', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    await assertRevert(staking.unstake(DEFAULT_STAKE_AMOUNT, EMPTY_DATA), STAKING_ERRORS.ERROR_NOT_ENOUGH_BALANCE)
  })

  it('creates a new allowance', async () => {
    await staking.allowManager(user1, DEFAULT_LOCK_AMOUNT, EMPTY_DATA)

    const { allowance  } = await staking.getLock(owner, user1)
    assertBn(allowance, DEFAULT_LOCK_AMOUNT, "allowed amount should match")
  })

  it('creates a new allowance and then lock manager locks', async () => {
    await approveAndStake({ staking, from: owner })
    await staking.allowManager(user1, DEFAULT_LOCK_AMOUNT, EMPTY_DATA)
    await staking.lock(owner, DEFAULT_LOCK_AMOUNT, { from: user1 })

    // check lock values
    const { amount, allowance } = await staking.getLock(owner, user1)
    assertBn(amount, DEFAULT_LOCK_AMOUNT, "locked amount should match")
    assertBn(allowance, DEFAULT_LOCK_AMOUNT, "locked allowance should match")

    assertBn(await staking.unlockedBalanceOf(owner), DEFAULT_STAKE_AMOUNT.sub(DEFAULT_LOCK_AMOUNT), "Unlocked balance should match")
  })

  it('fails creating allowance of 0 tokens', async () => {
    await assertRevert(staking.allowManager(user1, 0, EMPTY_DATA), STAKING_ERRORS.ERROR_AMOUNT_ZERO)
  })

  it('fails creating allowance if lock exists', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })
    await assertRevert(staking.allowManager(user1, 1, EMPTY_DATA), STAKING_ERRORS.ERROR_LOCK_ALREADY_EXISTS)
  })

  it('increases allowance of existing lock', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    await staking.increaseLockAllowance(user1, DEFAULT_LOCK_AMOUNT)

    const { allowance } = await staking.getLock(owner, user1)
    assertBn(allowance, DEFAULT_LOCK_AMOUNT.mul(bn(2)), "allowed amount should match")
  })

  it('fails increasing allowance of non-existing', async () => {
    await assertRevert(staking.increaseLockAllowance(user1, 1), STAKING_ERRORS.ERROR_LOCK_DOES_NOT_EXIST)
  })

  it('fails increasing allowance of existing lock by 0', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    await assertRevert(staking.increaseLockAllowance(user1, 0), STAKING_ERRORS.ERROR_AMOUNT_ZERO)
  })

  it('fails increasing allowance of existing lock if not owner or manager', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    await assertRevert(staking.increaseLockAllowance(user1, 1, { from: user2 }), STAKING_ERRORS.ERROR_LOCK_DOES_NOT_EXIST)
  })

  it('decreases allowance of existing lock by the owner', async () => {
    await approveAndStake({ staking, from: owner })
    await staking.allowManager(user1, DEFAULT_LOCK_AMOUNT.add(bn(1)), EMPTY_DATA)
    await staking.lock(owner, DEFAULT_LOCK_AMOUNT, { from: user1 })

    await staking.decreaseLockAllowance(owner, user1, 1, { from: owner })

    const { allowance } = await staking.getLock(owner, user1)
    assertBn(allowance, DEFAULT_LOCK_AMOUNT, "allowed amount should match")
  })

  it('decreases allowance of existing lock by manager', async () => {
    await approveAndStake({ staking, from: owner })
    await staking.allowManager(user1, DEFAULT_LOCK_AMOUNT.add(bn(1)), EMPTY_DATA)
    await staking.lock(owner, DEFAULT_LOCK_AMOUNT, { from: user1 })

    await staking.decreaseLockAllowance(owner, user1, 1, { from: user1 })

    const { allowance } = await staking.getLock(owner, user1)
    assertBn(allowance, DEFAULT_LOCK_AMOUNT, "allowed amount should match")
  })

  it('fails decreasing allowance of existing lock by 0', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    await assertRevert(staking.decreaseLockAllowance(owner, user1, 0), STAKING_ERRORS.ERROR_AMOUNT_ZERO)
  })

  it('fails decreasing allowance of existing lock to 0', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    await staking.unlock(owner, user1, DEFAULT_LOCK_AMOUNT, { from: user1 })

    await assertRevert(staking.decreaseLockAllowance(owner, user1, DEFAULT_LOCK_AMOUNT), STAKING_ERRORS.ERROR_ALLOWANCE_ZERO)
  })

  it('fails decreasing allowance to less than lock', async () => {
    await approveAndStake({ staking, from: owner })
    await staking.allowManager(user1, DEFAULT_LOCK_AMOUNT.add(bn(1)), EMPTY_DATA)
    await staking.lock(owner, DEFAULT_LOCK_AMOUNT, { from: user1 })

    await assertRevert(staking.decreaseLockAllowance(owner, user1, 2), STAKING_ERRORS.ERROR_NOT_ENOUGH_ALLOWANCE)
  })

  it('fails decreasing allowance by 3rd party', async () => {
    await approveAndStake({ staking, from: owner })
    await staking.allowManager(user1, DEFAULT_LOCK_AMOUNT.add(bn(1)), EMPTY_DATA)
    await staking.lock(owner, DEFAULT_LOCK_AMOUNT, { from: user1 })

    await assertRevert(staking.decreaseLockAllowance(owner, user1, 1, { from: user2 }), STAKING_ERRORS.ERROR_CANNOT_CHANGE_ALLOWANCE)
  })

  it('increases amount of existing lock', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    await approveAndStake({ staking, from: owner })
    await staking.increaseLockAllowance(user1, DEFAULT_LOCK_AMOUNT)
    await staking.lock(owner, DEFAULT_LOCK_AMOUNT, { from: user1 })

    const { amount } = await staking.getLock(owner, user1)
    assertBn(amount, DEFAULT_LOCK_AMOUNT.mul(bn(2)), "locked amount should match")
  })

  it('fails increasing lock with 0 tokens', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    await approveAndStake({ staking, from: owner })
    await assertRevert(staking.lock(owner, 0, { from: user1 }), STAKING_ERRORS.ERROR_AMOUNT_ZERO)
  })

  it('fails increasing lock with more tokens than staked', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    await approveAndStake({ staking, from: owner })
    await assertRevert(staking.lock(owner, DEFAULT_STAKE_AMOUNT.mul(bn(2)).add(bn(1)), { from: user1 }), STAKING_ERRORS.ERROR_NOT_ENOUGH_BALANCE)
  })

  it('unlocks with only 1 lock, EOA manager', async () => {
    await approveStakeAndLock({ staking, manager: user1, lockAmount: DEFAULT_LOCK_AMOUNT, from: owner })

    // unlock
    await staking.unlockAndRemoveManager(owner, user1, { from: user1 })

    assertBn(await staking.unlockedBalanceOf(owner), DEFAULT_STAKE_AMOUNT, "Unlocked balance should match")
    assertBn(await staking.lockedBalanceOf(owner), bn(0), "total locked doesn’t match")
  })

  it('unlocks with more than 1 lock, EOA manager', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })
    // lock again
    await staking.allowManager(user2, DEFAULT_LOCK_AMOUNT, EMPTY_DATA)
    await staking.lock(owner, DEFAULT_LOCK_AMOUNT, { from: user2 })

    const previousTotalLocked = await staking.lockedBalanceOf(owner)

    // unlock
    await staking.unlockAndRemoveManager(owner, user1, { from: user1 })

    assertBn(await staking.unlockedBalanceOf(owner), DEFAULT_STAKE_AMOUNT.sub(DEFAULT_LOCK_AMOUNT), "Unlocked balance should match")
    assertBn(await staking.lockedBalanceOf(owner), previousTotalLocked.sub(bn(DEFAULT_LOCK_AMOUNT)), "total locked doesn’t match")
  })

  it('unlocks completely, contract manager, called by owner', async () => {
    await lockManager.setResult(true)
    await approveStakeAndLock({ staking, manager: lockManager, from: owner })

    // unlock
    await staking.unlockAndRemoveManager(owner, lockManager.address, { from: owner })

    assertBn(await staking.unlockedBalanceOf(owner), DEFAULT_STAKE_AMOUNT, "Unlocked balance should match")
    assertBn(await staking.lockedBalanceOf(owner), bn(0), "total locked doesn’t match")
  })

  it('unlocks completely, contract manager, called by manager', async () => {
    await lockManager.setResult(true)
    await approveStakeAndLock({ staking, manager: lockManager, from: owner })

    // unlock
    await lockManager.unlockAndRemoveManager(staking.address, owner, lockManager.address)

    assertBn(await staking.unlockedBalanceOf(owner), DEFAULT_STAKE_AMOUNT, "Unlocked balance should match")
    assertBn(await staking.lockedBalanceOf(owner), bn(0), "total locked doesn’t match")
  })

  it('unlocks completely, contract manager, called by manager, even if condition is not satisfied', async () => {
    // not needed, is false by default
    //await lockManager.setResult(false)
    await approveStakeAndLock({ staking, manager: lockManager, from: owner })

    // unlock
    await lockManager.unlockAndRemoveManager(staking.address, owner, lockManager.address)

    assertBn(await staking.unlockedBalanceOf(owner), DEFAULT_STAKE_AMOUNT, "Unlocked balance should match")
    assertBn(await staking.lockedBalanceOf(owner), bn(0), "total locked doesn’t match")
  })

  it('fails calling canUnlock, EOA manager', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    // call canUnlock
    await assertRevert(staking.canUnlock(owner, owner, user1, 0)) // no reason: it’s trying to call an EOA
  })

  it('can unlock if amount is zero', async () => {
    await staking.allowManager(user1, DEFAULT_LOCK_AMOUNT, EMPTY_DATA, { from: owner })
    assert.isTrue(await staking.canUnlock(owner, owner, user1, 0))
  })

  it('fails to unlock if it cannot unlock, EOA manager', async () => {
    await approveStakeAndLock({ staking, manager: user1, from: owner })

    // tries to unlock
    await assertRevert(staking.unlockAndRemoveManager(owner, user1)) // no reason: it’s trying to call an EOA
  })

  it('fails to unlock if can not unlock, contract manager, called by owner', async () => {
    // not needed, is false by default
    // await lockManager.setResult(false)
    await approveStakeAndLock({ staking, manager: lockManager, from: owner })

    // tries to unlock
    await assertRevert(staking.unlockAndRemoveManager(owner, lockManager.address, { from: owner }), STAKING_ERRORS.ERROR_CANNOT_UNLOCK)
  })

  it('fails to unlock if, contract manager, called by 3rd party (even if condition is true)', async () => {
    await lockManager.setResult(true)
    await approveStakeAndLock({ staking, manager: lockManager, from: owner })

    // tries to unlock
    await assertRevert(staking.unlockAndRemoveManager(owner, lockManager.address, { from: user1 }), STAKING_ERRORS.ERROR_CANNOT_UNLOCK)
  })

  it('transfers (slash) and unlocks (everything else) in one transaction', async () => {
    const totalLock = bigExp(120, 18)
    const transferAmount = bigExp(40, 18)

    await approveStakeAndLock({ staking, manager: user1, allowanceAmount: totalLock, lockAmount: totalLock, stakeAmount: totalLock, from: owner })

    // unlock and transfer
    await staking.slashAndUnlock(owner, user2, totalLock.sub(transferAmount), transferAmount, { from: user1 })

    assertBn(await staking.unlockedBalanceOf(owner), totalLock.sub(transferAmount), "Unlocked balance should match")
    assertBn(await staking.lockedBalanceOf(owner), bn(0), "total locked doesn’t match")
    // lock manager
    assertBn(await staking.unlockedBalanceOf(user1), bn(0), "Unlocked balance should match")
    assertBn(await staking.lockedBalanceOf(user1), bn(0), "total locked doesn’t match")
    // recipient
    assertBn(await staking.unlockedBalanceOf(user2), transferAmount, "Unlocked balance should match")
    assertBn(await staking.lockedBalanceOf(user2), bn(0), "total locked doesn’t match")
  })

  it('transfers (slash) and unlocks in one transaction', async () => {
    const totalLock = bigExp(120, 18)
    const transferAmount = bigExp(40, 18)
    const decreaseAmount = bigExp(60, 18)

    await approveStakeAndLock({ staking, manager: user1, allowanceAmount: totalLock, lockAmount: totalLock, stakeAmount: totalLock, from: owner })

    // unlock and transfer
    await staking.slashAndUnlock(owner, user2, decreaseAmount, transferAmount, { from: user1 })

    assertBn(await staking.unlockedBalanceOf(owner), decreaseAmount, "Unlocked balance should match")
    assertBn(await staking.lockedBalanceOf(owner), totalLock.sub(decreaseAmount).sub(transferAmount), "total locked doesn’t match")
    // lock manager
    assertBn(await staking.unlockedBalanceOf(user1), bn(0), "Unlocked balance should match")
    assertBn(await staking.lockedBalanceOf(user1), bn(0), "total locked doesn’t match")
    // recipient
    assertBn(await staking.unlockedBalanceOf(user2), transferAmount, "Unlocked balance should match")
    assertBn(await staking.lockedBalanceOf(user2), bn(0), "total locked doesn’t match")
  })

  it('fails to transfer (slash) and unlock in one transaction if not owner nor manager', async () => {
    const totalLock = bigExp(120, 18)
    const transferAmount = bigExp(40, 18)
    const decreaseAmount = bigExp(60, 18)

    await approveStakeAndLock({ staking, manager: user1, allowanceAmount: totalLock, lockAmount: totalLock, stakeAmount: totalLock, from: owner })

    // unlock and transfer
    await assertRevert(staking.slashAndUnlock(owner, user2, decreaseAmount, transferAmount, { from: user2 }), STAKING_ERRORS.ERROR_NOT_ENOUGH_LOCK)
  })

  it('change lock amount', async () => {
    await approveStakeAndLock({ staking, manager: lockManager, from: owner })
    const { amount: amount1 } = await staking.getLock(owner, lockManager.address)
    assertBn(amount1, bn(DEFAULT_LOCK_AMOUNT), "Amount should match")
    assertBn(await staking.unlockedBalanceOf(owner), DEFAULT_STAKE_AMOUNT.sub(DEFAULT_LOCK_AMOUNT), "Unlocked balance should match")

    // change amount
    const unlockAmount = DEFAULT_LOCK_AMOUNT.div(bn(2))
    await lockManager.unlock(staking.address, owner, unlockAmount)

    const { amount: amount2 } = await staking.getLock(owner, lockManager.address)
    assertBn(amount2, unlockAmount, "Amount should match")
    assertBn(await staking.unlockedBalanceOf(owner), DEFAULT_STAKE_AMOUNT.sub(unlockAmount), "Unlocked balance should match")
  })

  it('fails to change lock amount to zero', async () => {
    await approveStakeAndLock({ staking, manager: lockManager, from: owner })

    // try to change amount
    await assertRevert(lockManager.unlock(staking.address, owner, 0), STAKING_ERRORS.ERROR_AMOUNT_ZERO)
  })

  it('fails to change lock amount to greater than before', async () => {
    await approveStakeAndLock({ staking, manager: lockManager, from: owner })

    // try to change amount
    await assertRevert(lockManager.unlock(staking.address, owner, DEFAULT_LOCK_AMOUNT.add(bn(1))), STAKING_ERRORS.ERROR_NOT_ENOUGH_LOCK)
  })
})
